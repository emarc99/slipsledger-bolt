import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ReceiptText, ScanLine, ShieldCheck, FolderOpen, CalendarRange, ArrowRight, Lock, Fingerprint, Download } from 'lucide-react';
import AuthForm from '@/components/AuthForm';
import { useAuth } from '@/lib/auth';
import { useReveal } from '@/hooks/useReveal';

export default function Landing() {
  const [showAuth, setShowAuth] = useState<null | 'signin' | 'signup'>(null);
  const { signIn, signUp } = useAuth();

  if (showAuth) {
    return (
      <AuthForm
        mode={showAuth}
        onToggleMode={() => setShowAuth(showAuth === 'signin' ? 'signup' : 'signin')}
        onSubmit={showAuth === 'signin' ? signIn : signUp}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      <Header onSignup={() => setShowAuth('signup')} />

      <Hero onSignup={() => setShowAuth('signup')} onSignin={() => setShowAuth('signin')} />

      <RevealSection className="border-t border-white/10 bg-surface-900/60">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-20 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          <Feature icon={ScanLine} accent="brand" title="Snap to record" body="Upload or send any receipt photo. The reader extracts the amount, date, merchant, and what it was for — you confirm before it's filed." />
          <Feature icon={ShieldCheck} accent="success" title="Tamper-evident proof" body="Each document gets a cryptographic fingerprint at upload. Later, anyone can verify the photo is exactly the one you filed." />
          <Feature icon={FolderOpen} accent="info" title="Cases for disputes" body="Bundle related receipts — a deposit dispute, a warranty claim, an expense report — and print a clean evidence report." />
          <Feature icon={CalendarRange} accent="warning" title="Rent tracking built in" body="For landlords: lease-aware rent timelines show paid, owing, overdue, and in-credit at a glance, with a Telegram bot on the go." />
        </div>
      </RevealSection>

      <RevealSection className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <h2 className="text-center font-display text-3xl font-bold text-white">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Step n="01" title="Photograph anything" body="A rent receipt, a diesel top-up, a pharmacy bill. Any slip becomes a document in your vault." />
            <Step n="02" title="Confirm the read" body="SlipsLedger's reader proposes the details. You check them — nothing is filed until you approve." />
            <Step n="03" title="Prove it forever" body="Search it years later, bundle it into a case, and print an evidence report when a dispute lands." />
          </div>
        </div>
      </RevealSection>

      <RevealSection className="border-t border-white/10 bg-surface-900/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <h2 className="text-center font-display text-3xl font-bold text-white">Privacy, in plain words</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-surface-400">
            The fine print you shouldn't need a lawyer for. Here's exactly what happens to your data.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Privacy icon={Lock} title="Private by default" body="Your documents, cases, and records are visible only to your account — enforced by the database, not just the app." />
            <Privacy icon={ScanLine} title="AI reads, nothing else" body="Receipt images are read by our AI service only to extract the details, over an encrypted connection." />
            <Privacy icon={Fingerprint} title="Provable integrity" body="Each document carries a cryptographic fingerprint (SHA-256) recorded at filing, so its integrity can be proven later." />
            <Privacy icon={ShieldCheck} title="Never sold, never shared" body="Nothing is ever sold or shared. Share links show only what you choose, expire, and can be revoked." />
            <Privacy icon={Download} title="Your data, always yours" body="You can export everything, or delete your account and all data permanently, any time." />
            <div className="dark-card grain flex flex-col justify-between p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/30 hover:shadow-glow">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/15">
                  <ArrowRight className="h-5 w-5 text-brand-300" />
                </div>
                <h3 className="mt-4 font-semibold text-white">Ready to see for yourself?</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-surface-400">Every promise on this page is live in the product, not a policy page.</p>
              </div>
              <button className="btn-secondary mt-5 self-start press" onClick={() => setShowAuth('signup')}>Create free account</button>
            </div>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="relative overflow-hidden border-t border-white/10">
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-8">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Start your archive today.</h2>
          <p className="mx-auto mt-4 max-w-lg text-surface-300">The receipt you file now is the proof you'll have later. Free to start.</p>
          <button className="btn-primary mt-8 !bg-brand-500 !px-6 !py-3 !text-base hover:!bg-brand-400 press" onClick={() => setShowAuth('signup')}>
            Create free account <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </RevealSection>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-surface-500">
        SlipsLedger — permanent records for businesses, landlords, and everyone with a drawer full of receipts.
      </footer>
    </div>
  );
}

function Header({ onSignup }: { onSignup: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? 'border-b border-white/10 bg-surface-950/85 backdrop-blur shadow-glow' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <div className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 shadow-glow transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <ReceiptText className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-white">SlipsLedger</span>
        </div>
        <button className="btn-primary !py-2 !bg-brand-500 hover:!bg-brand-400 press" onClick={onSignup}>Get started</button>
      </div>
    </header>
  );
}

function Hero({ onSignup, onSignin }: { onSignup: () => void; onSignin: () => void }) {
  return (
    <section className="grain relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-24">
        <div className="animate-fade-up text-center lg:text-left">
          <span className="stamp !border-brand-400 !text-brand-300">Permanent records</span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Every receipt becomes a&nbsp;
            <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-brand-400 bg-clip-text text-transparent">permanent record</span>.
            Every dispute, already won.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-surface-300 lg:mx-0">
            Photograph any receipt or payment confirmation. SlipsLedger reads it, timestamps it, and keeps it
            searchable forever — rent, utilities, purchases, services. Bundle receipts into cases and print
            evidence when you need it.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <button
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-brand-500 px-6 py-3 text-base font-semibold text-white shadow-glow transition-all duration-300 hover:-translate-y-px hover:bg-brand-400 hover:shadow-glow-accent active:translate-y-0 press"
              onClick={onSignup}
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              Create free account <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-base font-semibold text-surface-100 transition-all duration-300 hover:border-brand-400/40 hover:bg-white/10 hover:shadow-glow press"
              onClick={onSignin}
            >
              I already have one
            </button>
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-sm text-surface-400 lg:justify-start">
            <Lock className="h-3.5 w-3.5 text-brand-400" /> Private by design — your records are locked to your account, enforced by the database.
          </p>
        </div>

        <ReceiptDemo />
      </div>
    </section>
  );
}

const DEMO_STEPS = [
  { label: 'Reading receipt…', detail: 'merchant, amount, date' },
  { label: 'Fingerprinting…', detail: 'SHA-256 recorded' },
  { label: 'Filed to vault', detail: 'permanent record created' },
];

function ReceiptDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= DEMO_STEPS.length) {
      const t = setTimeout(() => setStep(0), 3600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 1100 : 900);
    return () => clearTimeout(t);
  }, [step]);

  const scanning = step === 0;

  return (
    <div className="relative mx-auto w-full max-w-sm animate-fade-up" style={{ animationDelay: '150ms' }}>
      <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-brand-500/10 blur-2xl" />
      <div className="dark-card grain relative rotate-1 p-6 shadow-glow transition-transform duration-500 hover:rotate-0">
        <div className="flex items-center justify-between border-b border-dashed border-white/15 pb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-surface-400">Receipt · #0001</span>
          <ReceiptText className="h-4 w-4 text-brand-400" />
        </div>
        <p className="mt-4 font-display text-lg font-semibold text-white">Ikeja Electric</p>
        <p className="text-sm text-surface-400">Prepaid meter recharge</p>
        <p className="amount mt-4 text-3xl font-medium text-white">₦18,000.00</p>
        <p className="amount mt-1 text-xs text-surface-500">12 Oct 2026 · POS terminal 4417</p>
        <div className="amount mt-4 flex items-center gap-2 truncate rounded border border-white/10 bg-black/30 px-2.5 py-1.5 text-[10px] text-brand-300">
          <ShieldCheck className="h-3 w-3 text-success-400" />
          sha256 · 9f2c…a41e · verified
        </div>
        <div className="mt-4 min-h-[2.4rem]">
          {step < DEMO_STEPS.length ? (
            <p className="flex items-center gap-2 text-xs text-surface-300">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-400" />
              {DEMO_STEPS[step].label} <span className="text-surface-500">{DEMO_STEPS[step].detail}</span>
            </p>
          ) : (
            <span className="stamp animate-stamp-in !border-success-400 !text-success-300">Filed</span>
          )}
        </div>
        {scanning && (
          <div className="pointer-events-none absolute inset-x-4 inset-y-0 overflow-hidden rounded-lg">
            <div className="absolute inset-x-0 h-0.5 animate-[shimmer-bar_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_12px_2px_rgba(205,163,92,.6)]" />
          </div>
        )}
      </div>
    </div>
  );
}

const ACCENT_MAP = {
  brand: { icon: 'bg-brand-500/15 text-brand-300', border: 'hover:border-brand-400/30', glow: 'hover:shadow-glow' },
  success: { icon: 'bg-success-500/15 text-success-300', border: 'hover:border-success-400/30', glow: 'hover:shadow-glow-success' },
  info: { icon: 'bg-info-500/15 text-info-300', border: 'hover:border-info-400/30', glow: 'hover:shadow-glow' },
  warning: { icon: 'bg-warning-500/15 text-warning-300', border: 'hover:border-warning-400/30', glow: 'hover:shadow-glow' },
} as const;

function Feature({ icon: Icon, title, body, accent }: { icon: typeof ScanLine; title: string; body: string; accent: keyof typeof ACCENT_MAP }) {
  const a = ACCENT_MAP[accent];
  return (
    <div className={`dark-card grain group p-6 transition-all duration-300 hover:-translate-y-1 ${a.border} ${a.glow}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${a.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-surface-400">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="group text-center">
      <span className="amount inline-block text-sm text-brand-400 transition-transform duration-300 group-hover:scale-125">{n}</span>
      <h3 className="mt-2 font-display text-xl font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-surface-400">{body}</p>
    </div>
  );
}

function Privacy({ icon: Icon, title, body }: { icon: typeof ScanLine; title: string; body: string }) {
  return (
    <div className="dark-card grain group p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/30 hover:shadow-glow">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/15 transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-5 w-5 text-brand-300" />
      </div>
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-surface-400">{body}</p>
    </div>
  );
}

function RevealSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <section ref={ref} className={`${className} transition-all duration-700 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {children}
    </section>
  );
}
