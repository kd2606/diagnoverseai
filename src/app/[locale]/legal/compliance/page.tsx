import { Scale, CheckCircle2, Stethoscope } from 'lucide-react';

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_80%)]"
      />

      <main className="relative mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <header className="mb-16">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] shadow-inner">
            <Scale className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            HIPAA & SaMD Compliance
          </h1>
          <p className="mt-4 text-lg text-white/50">
            Regulatory stance, AI explainability, and Human-in-the-Loop workflows.
          </p>
        </header>

        <article className="prose prose-invert prose-emerald max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-emerald-400 prose-p:leading-relaxed prose-p:text-white/70">
          <h2>1. Regulatory Classification (CDSCO & FDA)</h2>
          <p>
            <strong>CDSCO Exemption Status:</strong> DiagnoVerse AI operates strictly as a Clinical Decision 
            Support System (CDSS) and is <em>not</em> classified as a Software as a Medical Device (SaMD). 
            Our platform does not independently diagnose, treat, or cure any disease. It serves exclusively 
            as an administrative and triage routing tool designed to accelerate the intake process for 
            registered medical practitioners.
          </p>

          <h2>2. Explainable AI (No Black Box)</h2>
          <p>
            To ensure complete clinical safety and regulatory transparency, DiagnoVerse AI rejects "black box" 
            generative responses presented directly to patients.
          </p>
          <ul>
            <li>
              <strong>Deterministic Boundaries:</strong> All AI extractions (transcripts, vision payloads) are 
              strictly mapped to deterministic clinical matrices. 
            </li>
            <li>
              <strong>Hardcoded Safety:</strong> The patient-facing UI exclusively renders pre-approved, hardcoded 
              clinical guidance and triage next-steps based on the AI's confidence tier. The raw generative 
              inference is never exposed as medical advice.
            </li>
          </ul>

          <h2>3. Human-in-the-Loop Architecture</h2>
          <p>
            The cornerstone of our compliance model is the mandatory Human-in-the-Loop (HITL) requirement.
          </p>
          <ul>
            <li>
              <strong>Zero-Trust Clinician Adjudication Queue:</strong> Every triage case escalated by a patient 
              enters a highly secure queue. Final sign-off, diagnosis, and prescription are executed exclusively 
              by registered medical practitioners.
            </li>
            <li>
              <strong>Audit Logging:</strong> Every action taken by a clinician (approvals, overrides, escalations) 
              is cryptographically signed and logged in a WORM-compliant audit trail to ensure full accountability.
            </li>
          </ul>
        </article>
      </main>
    </div>
  );
}
