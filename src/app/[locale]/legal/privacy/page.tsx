import { Shield, Lock, FileKey } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.15),transparent_80%)]"
      />

      <main className="relative mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <header className="mb-16">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] shadow-inner">
            <Lock className="h-6 w-6 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-lg text-white/50">
            Enterprise-grade data protection and WORM compliance.
          </p>
        </header>

        <article className="prose prose-invert prose-indigo max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-indigo-400 prose-p:leading-relaxed prose-p:text-white/70">
          <h2>1. Data Architecture & Persistence</h2>
          <p>
            DiagnoVerse AI is built on a Zero-Trust architecture designed for clinical environments. 
            We employ <strong>Cryptographic WORM (Write-Once-Read-Many) storage</strong> for all patient records. 
            Once a triage case is committed to the Clinical Vault, it is permanently logged and cannot be silently 
            altered or deleted, ensuring an immutable audit trail for both patients and healthcare providers.
          </p>

          <h2>2. Triage Data Processing</h2>
          <p>
            When utilizing our multimodal triage system:
          </p>
          <ul>
            <li>
              <strong>Ephemeral Processing:</strong> Voice and text triage inputs undergo <em>ephemeral processing</em>. 
              Audio streams and intermediate transcripts are processed strictly in-memory during inference and are 
              instantly purged. We enforce a strict no-unauthorized-retention policy on raw audio data.
            </li>
            <li>
              <strong>Structured Extraction:</strong> Only the clinically relevant structured JSON (e.g., ICD-10 codes, 
              clinical rationale, and differentials) is persisted securely in your Clinical Vault.
            </li>
          </ul>

          <h2>3. Clinical Handoffs</h2>
          <p>
            DiagnoVerse AI bridges the gap between rural patients and registered medical practitioners. 
            When a case is escalated via the "Send to Clinician Command Center" button, the payload is transmitted 
            using strict <strong>end-to-end encryption</strong>. Only authorized, verified clinicians within the 
            adjudication queue can decrypt and review the triage record.
          </p>

          <h2>4. Data Sovereignty</h2>
          <p>
            All data remains geographically localized and encrypted at rest (AES-256) and in transit (TLS 1.3). 
            We do not sell, share, or monetize patient health data to third-party data brokers.
          </p>
        </article>
      </main>
    </div>
  );
}
