/*
# Telegram bot edge function

Receives Telegram webhook updates (set the webhook to this function's URL).
Handles:
1. Photo messages — downloads the slip, runs Gemini extraction, files the
   payment against the sender's SlipsLedger account, replies with a summary.
2. Text questions — answers from the live ledger:
   "who owes me?", "has <name> paid?", "how much did I collect this month?".

Security:
- Each Telegram chat is linked to a SlipsLedger account in `bot_links`
  (one-time code claimed atomically via /start <code>).
- verify_jwt is false (Telegram cannot send our JWT); authenticity comes from
  Telegram's secret_token header, compared against TELEGRAM_BOT_SECRET.
*/

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-2.0-flash-lite";

interface TgUser { id: number; first_name?: string }
interface TgPhoto { file_id: string; width: number; height: number; file_size?: number }
interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number };
  text?: string;
  photo?: TgPhoto[];
}
interface TgUpdate { message?: TgMessage }

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function reply(chatId: number, text: string): Response {
  // Fire-and-forget: acknowledge the webhook quickly.
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  EdgeRuntime.waitUntil(
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    }).catch((e) => console.error("tg reply failed", e)),
  );
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const secret = Deno.env.get("TELEGRAM_BOT_SECRET");
    if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update: TgUpdate = await req.json().catch(() => ({}));
    const msg = update.message;
    if (!msg?.from) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });

    const chatId = msg.chat.id;
    const link = await getLink(msg.from.id);
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

    if (!link) {
      const codeMatch = msg.text?.trim().match(/^\/start\s+([a-f0-9]{12})$/i);
      if (codeMatch && (await claimCode(codeMatch[1].toLowerCase(), msg.from.id, chatId))) {
        return reply(chatId, "Connected! Send me a slip photo or ask things like \"who owes me?\".");
      }
      return reply(chatId, "This bot needs to be linked to your SlipsLedger account. Open SlipsLedger → Settings to get your connection code, then send /start <code>.");
    }

    const userId = link.user_id;
    const currency = await getCurrency(userId);

    if (msg.photo?.length) {
      return handlePhoto(msg.photo, token, userId, currency, chatId);
    }

    const text = (msg.text ?? "").trim();
    if (!text) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });

    return reply(chatId, await answerQuestion(text, userId, currency));
  } catch (err) {
    console.error("telegram webhook failed", err);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }
});

async function getLink(tgId: number): Promise<{ user_id: string } | null> {
  const { data } = await admin.from("bot_links").select("user_id").eq("telegram_id", tgId).maybeSingle();
  return data;
}

async function claimCode(code: string, tgId: number, chatId: number): Promise<boolean> {
  // Atomic single-use claim: check and consume in one statement.
  const { data, error } = await admin
    .from("bot_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", code)
    .is("used_at", null)
    .select("user_id")
    .maybeSingle();
  if (error || !data) return false;
  await admin.from("bot_links").upsert(
    { telegram_id: tgId, user_id: data.user_id, chat_id: chatId },
    { onConflict: "telegram_id" },
  );
  return true;
}

async function getCurrency(userId: string): Promise<string> {
  const { data } = await admin.from("profiles").select("currency").eq("id", userId).maybeSingle();
  return data?.currency ?? "NGN";
}

async function money(amount: number, currency: string): Promise<string> {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

async function handlePhoto(
  photos: TgPhoto[], token: string, userId: string, currency: string, chatId: number,
): Promise<Response> {
  const best = [...photos].sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0))[0];
  const filePathRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${best.file_id}`);
  if (!filePathRes.ok) return reply(chatId, "I could not read that photo — try again.");
  const filePath = (await filePathRes.json()).result?.file_path as string | undefined;
  if (!filePath) return reply(chatId, "I could not read that photo — try again.");

  const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!fileRes.ok) return reply(chatId, "I could not download that photo — try again.");
  const bytes = new Uint8Array(await fileRes.arrayBuffer());

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return reply(chatId, "The AI reader is not configured yet. Add payments in the app for now.");

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PHOTO_PROMPT },
            { inline_data: { mime_type: "image/jpeg", data: btoaFromArray(bytes) } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      }),
    },
  );
  if (!geminiRes.ok) return reply(chatId, "The AI reader could not process this slip.");
  const body = await geminiRes.json();
  const raw: string | undefined = body?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse((raw ?? "").replace(/```json|```/g, "").trim());
  } catch {
    return reply(chatId, "I could not read this slip clearly. Try a sharper photo, or add it in the app.");
  }
  if (parsed.error === "not_a_slip") return reply(chatId, "That image does not look like a payment slip.");

  const amount = typeof parsed.amount === "number" ? parsed.amount : null;
  const paidOn = dateStr(parsed.paid_on);
  if (amount === null || !paidOn) return reply(chatId, "I could not find the amount or date on this slip.");

  // Match or create the payer.
  const payerName = typeof parsed.payer_name === "string" ? parsed.payer_name.trim().slice(0, 120) : "";
  let personId: string | null = null;
  if (payerName) {
    const { data: existing } = await admin
      .from("people")
      .select("id")
      .eq("user_id", userId)
      .ilike("full_name", `%${payerName.split(" ")[0]}%`)
      .limit(1)
      .maybeSingle();
    if (existing) personId = existing.id;
    else {
      const { data: created } = await admin
        .from("people")
        .insert({ user_id: userId, full_name: payerName })
        .select("id")
        .maybeSingle();
      personId = created?.id ?? null;
    }
  }

  const { error: payErr } = await admin.from("payments").insert({
    user_id: userId,
    person_id: personId,
    amount,
    paid_on: paidOn,
    payment_type: typeof parsed.payment_type === "string" && ["rent", "cleaning", "guard", "other"].includes(parsed.payment_type) ? parsed.payment_type : "rent",
    covers_from: dateStr(parsed.covers_from),
    covers_to: dateStr(parsed.covers_to),
    note: typeof parsed.note === "string" ? parsed.note.slice(0, 280) : "",
    source: "telegram",
  });
  if (payErr) {
    console.error("tg payment insert failed", payErr);
    return reply(chatId, "I read the slip but could not file it. Please add it in the app.");
  }
  return reply(chatId, `Filed: ${payerName || "Payer"} — ${await money(amount, currency)} on ${paidOn}. Review it in SlipsLedger to attach lease coverage.`);
}

const PHOTO_PROMPT = `You read payment slips/receipts for a landlord. Extract exactly this JSON (no markdown, no extra keys):
{"payer_name": string, "amount": number, "paid_on": "YYYY-MM-DD", "payment_type": "rent"|"cleaning"|"guard"|"other", "covers_from": "YYYY-MM-DD"|null, "covers_to": "YYYY-MM-DD"|null, "note": string}
If the image is not a payment slip, return {"error":"not_a_slip"}.`;

function dateStr(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

async function answerQuestion(text: string, userId: string, currency: string): Promise<string> {
  const q = text.toLowerCase();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: people } = await admin.from("people").select("id, full_name").eq("user_id", userId);
  const { data: payments } = await admin.from("payments").select("*").eq("user_id", userId);

  if (!people || !payments) return "I could not read the ledger right now — try again shortly.";

  const collectMonth = (p: { paid_on: string }) => p.paid_on.slice(0, 7) === thisMonth;

  if (q.includes("owe")) {
    const owed = people.map((person) => {
      const pays = payments.filter((p) => p.person_id === person.id && p.payment_type === "rent");
      let covered = new Set<string>();
      for (const p of pays) {
        const from = p.covers_from ? p.covers_from.slice(0, 7) : p.paid_on.slice(0, 7);
        const to = p.covers_to ? p.covers_to.slice(0, 7) : p.paid_on.slice(0, 7);
        let cur = from;
        let guard = 0;
        while (cur <= to && guard < 120) {
          covered.add(cur);
          const [y, m] = cur.split("-").map(Number);
          const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
          cur = next;
          guard++;
        }
      }
      const { data: ten } = await admin.from("tenancies").select("*").eq("person_id", person.id).maybeSingle();
      if (!ten) return { name: person.full_name, owedMonths: [] as string[] };
      const start = ten.start_date.slice(0, 7);
      const owedMonths: string[] = [];
      let cur = start < thisMonth ? start : thisMonth;
      let guard = 0;
      while (cur <= thisMonth && guard < 120) {
        if (!covered.has(cur)) owedMonths.push(cur);
        const [y, m] = cur.split("-").map(Number);
        const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
        cur = next;
        guard++;
      }
      return { name: person.full_name, owedMonths };
    });
    const owing = owed.filter((o) => o.owedMonths.length > 0);
    if (owing.length === 0) return "Nobody owes you right now — everyone is covered.";
    return "Owing:\n" + owing.map((o) => `• ${o.name} — ${o.owedMonths.length} month(s) (from ${o.owedMonths[0]})`).join("\n");
  }

  if (q.startsWith("has ") || q.includes("paid?") || q.includes(" have ")) {
    const namePart = text.replace(/has\s+/i, "").replace(/\?+$/, "").replace(/paid/i, "").trim();
    const person = people.find((p) => p.full_name.toLowerCase().includes(namePart.toLowerCase().split(" ")[0] ?? "###"));
    if (!person) return `I could not find "${namePart}" in your people. Add them in the app first.`;
    const paidThisMonth = payments.some((p) => p.person_id === person.id && p.payment_type === "rent" && collectMonth(p) === false ? coversThisMonth(p, thisMonth) : collectMonth(p) || coversThisMonth(p, thisMonth));
    return paidThisMonth ? `Yes — ${person.full_name} is covered for ${thisMonth}.` : `No — ${person.full_name} has not paid for ${thisMonth} yet.`;
  }

  if (q.includes("collect") || q.includes("this month") || q.includes("total")) {
    const total = payments.filter(collectMonth).reduce((s, p) => s + p.amount, 0);
    return `You collected ${await money(total, currency)} in ${thisMonth} across ${payments.filter(collectMonth).length} payment(s).`;
  }

  return "Ask me: \"who owes me?\", \"has <name> paid?\", or \"how much did I collect this month?\". You can also send a slip photo to file a payment.";
}

function coversThisMonth(p: { covers_from: string | null; covers_to: string | null }, month: string): boolean {
  if (p.covers_from && p.covers_to) return p.covers_from.slice(0, 7) <= month && month <= p.covers_to.slice(0, 7);
  return false;
}

function btoaFromArray(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
