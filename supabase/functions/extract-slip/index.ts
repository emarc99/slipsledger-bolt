/*
# Extract-slip edge function

Receives { imagePath } (path inside the private `slips` bucket), verifies the
caller's JWT, downloads the image server-side, sends it to Gemma 4 via the
Gemini API for structured extraction, validates the output shape, and returns
a JSON draft: { title, payer_name, merchant, amount, paid_on, category,
payment_type, covers_from, covers_to, note }.

Security:
- The GEMINI_API_KEY secret never reaches the browser.
- The caller must be authenticated; the image path's first folder must equal
  their user id, so nobody can point this at another user's slip.
- Generic error messages only; details go to the function log.

Model handling mirrors the proven week2-mlh-hacktoberfest Gemma client:
gemma-4-26b-a4b-it, image first / prompt second, no system instruction,
downscaled JPEG payloads, and retry with backoff on transient API errors.
*/

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMMA_MODEL = "gemma-4-26b-a4b-it";
const RETRY_ATTEMPTS = 4;
const RETRY_BASE_MS = 1500;

const PROMPT = `You are SlipsLedger's slip analyst for a permanent record service.
Given a photo of a handwritten or printed payment slip or receipt, classify the
payment and extract structured fields. Be precise with amounts and dates.

Respond with ONLY valid JSON matching the schema. No markdown fences. No extra keys.

{"title": string, "payer_name": string, "merchant": string, "amount": number, "paid_on": "YYYY-MM-DD", "category": "rent"|"utilities"|"groceries"|"services"|"goods"|"transport"|"medical"|"education"|"other", "payment_type": "rent"|"cleaning"|"guard"|"other", "covers_from": "YYYY-MM-DD"|null, "covers_to": "YYYY-MM-DD"|null, "note": string}

Rules:
- title: short description of what was paid for (e.g. "Deposit — Flat B", "Diesel top-up").
- payer_name: person/business that paid (empty if you paid someone).
- merchant: business/person paid to (empty if someone paid you).
- amount: total amount (number only). If unreadable, use 0.
- paid_on: transaction date. If unreadable, use "".
- category: rent/lease → rent; electricity/water/waste/internet → utilities; food shopping → groceries; labor/cleaning/repair → services; physical products → goods; fuel/taxi/fare → transport; pharmacy/clinic → medical; school/fees → education; else other.
- payment_type: only relevant when category is rent: rent/lease → rent; cleaning/sanitation → cleaning; guard/security → guard; else other.
- covers_from/covers_to: only if the receipt states a period covered (e.g. "rent for March to June"); otherwise null.
- note: one short line with anything notable (reference number, method, risk flag like mismatched names or overwritten figures).
If the image is not a receipt or payment confirmation, return {"error":"not_a_slip"}.`;

interface Extracted {
  title?: string;
  payer_name?: string;
  merchant?: string;
  amount?: number;
  paid_on?: string;
  category?: string;
  payment_type?: string;
  covers_from?: string | null;
  covers_to?: string | null;
  note?: string;
  error?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function downscaleImage(bytes: Uint8Array, mime: string): Promise<{ bytes: Uint8Array; mime: string }> {
  // Photos are already normalized to ≤1600px JPEG client-side before upload;
  // this is a pass-through safety net for anything uploaded by other means.
  return { bytes, mime: mime || "image/jpeg" };
}

function isRetryable(status: number, body: string): boolean {
  return (
    [429, 500, 503, 504].includes(status) ||
    /resource_exhausted|internal|unavailable|deadline|temporar/i.test(body)
  );
}

async function callGemma(bytes: Uint8Array, mime: string, apiKey: string): Promise<string> {
  let lastStatus = 0;
  let lastBody = "";
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { inline_data: { mime_type: mime, data: btoaFromArray(bytes) } },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: { temperature: 0.2 },
        }),
      },
    );
    if (res.ok) {
      const body = await res.json();
      const text = body?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim();
      if (text) return text;
      lastStatus = 200;
      lastBody = JSON.stringify(body).slice(0, 500);
    } else {
      lastStatus = res.status;
      lastBody = await res.text().catch(() => "");
      console.error(`gemma attempt ${attempt} failed`, lastStatus, lastBody.slice(0, 500));
    }
    if (attempt < RETRY_ATTEMPTS && isRetryable(lastStatus, lastBody)) {
      await sleep(RETRY_BASE_MS * attempt);
      continue;
    }
    break;
  }
  throw new Error(`Gemma API failed (${lastStatus}): ${lastBody.slice(0, 300)}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Not authorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Not authorized" }, 401);
    const userId = userData.user.id;

    const { imagePath } = await req.json().catch(() => ({ imagePath: null }));
    if (typeof imagePath !== "string" || !imagePath.startsWith(`${userId}/`)) {
      return json({ error: "Invalid image path" }, 400);
    }

    // Download the slip with the service role (bucket is private).
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: blob, error: dlErr } = await admin.storage.from("slips").download(imagePath);
    if (dlErr || !blob) {
      console.error("slip download failed", dlErr);
      return json({ error: "Could not read that image" }, 404);
    }
    const original = new Uint8Array(await blob.arrayBuffer());
    const contentType = blob.type || "image/jpeg";

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "AI reader is not configured yet — fill the details manually" }, 503);

    const { bytes, mime } = await downscaleImage(original, contentType);
    const text = await callGemma(bytes, mime, apiKey);

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    let parsed: Extracted;
    try {
      parsed = JSON.parse(match ? match[0] : cleaned);
    } catch {
      console.error("gemma output not JSON", cleaned.slice(0, 200));
      return json({ error: "The AI reader returned an unreadable result" }, 502);
    }
    if (parsed.error === "not_a_slip") return json({ error: "That image does not look like a payment slip" }, 422);

    // Strict shape validation — only known fields, sane values.
    const result: Record<string, unknown> = {};
    if (typeof parsed.title === "string") result.title = parsed.title.slice(0, 140);
    if (typeof parsed.payer_name === "string") result.payer_name = parsed.payer_name.slice(0, 120);
    if (typeof parsed.merchant === "string") result.merchant = parsed.merchant.slice(0, 120);
    if (typeof parsed.amount === "number" && Number.isFinite(parsed.amount) && parsed.amount >= 0) {
      result.amount = Math.round(parsed.amount * 100) / 100;
    }
    const dateOk = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (dateOk(parsed.paid_on)) result.paid_on = parsed.paid_on;
    if (typeof parsed.category === "string" && ["rent", "utilities", "groceries", "services", "goods", "transport", "medical", "education", "other"].includes(parsed.category)) {
      result.category = parsed.category;
    }
    if (typeof parsed.payment_type === "string" && ["rent", "cleaning", "guard", "other"].includes(parsed.payment_type)) {
      result.payment_type = parsed.payment_type;
    }
    if (dateOk(parsed.covers_from)) result.covers_from = parsed.covers_from;
    if (dateOk(parsed.covers_to)) result.covers_to = parsed.covers_to;
    if (typeof parsed.note === "string") result.note = parsed.note.slice(0, 280);

    return json(result);
  } catch (err) {
    console.error("extract-slip failed", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("(429)")) {
      return json({ error: "The AI reader is busy right now — wait a moment and try again" }, 502);
    }
    if (msg.includes("(500)") || msg.includes("(503)")) {
      return json({ error: "The AI reader is temporarily unavailable — try again in a few seconds" }, 502);
    }
    return json({ error: "Could not auto-read the slip — fill the details in below" }, 502);
  }
});

function btoaFromArray(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
