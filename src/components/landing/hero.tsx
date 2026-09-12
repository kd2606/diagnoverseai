import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Activity, Users } from 'lucide-react';
import styles from './landing.module.css';

export default function Hero() {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroLeft}>
        <p style={{ color: '#6366f1', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          NEXT-GEN AI-FIRST HEALTHCARE
        </p>
        <h1 className={styles.heroTitle}>
          Triage intelligence. <br/> Seamless care.
        </h1>
        <p className={styles.heroSubtitle}>
          DiagnoVerse AI leverages multimodal generative models to analyze medical records instantly, empowering clinicians with structured insights and giving patients zero-friction triage support.
        </p>
        <div className={styles.heroActions} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <Link href="/auth/login" className={styles.btnPrimary} style={{ background: '#6366f1', color: '#fff', border: 'none' }}>
            Clinician Portal
          </Link>
          <Link href="/auth/login" className={styles.btnPrimary} style={{ background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1' }}>
            Patient Portal
          </Link>
        </div>
        <div className={styles.trustStrip}>
          <div className={styles.trustItem}>
            <ShieldCheck size={18} color="#6366f1" />
            <span>AI-Guided</span>
          </div>
          <div className={styles.trustItem}>
            <Lock size={18} color="#6366f1" />
            <span>HIPAA Compliant</span>
          </div>
          <div className={styles.trustItem}>
            <Activity size={18} color="#6366f1" />
            <span>Real-time Triage</span>
          </div>
          <div className={styles.trustItem}>
            <Users size={18} color="#6366f1" />
            <span>B2B & B2C</span>
          </div>
        </div>
      </div>
      <div className={styles.heroRight}>
        <div className={styles.phoneMockup}>
          <div className={styles.phoneNotch}></div>
          <div className={styles.workflowApp}>
            <div className={styles.workflowHeader}>
              <div className={styles.workflowBrand}>DiagnoVerse AI</div>
              <div className={styles.offlineIndicator}>
                <span className={styles.offlineDot} style={{ background: '#22c55e' }}></span>
                System Online
              </div>
            </div>
            <div className={styles.workflowContent}>

              <div className={styles.workflowCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.caseId}>Scan Uploaded</span>
                  <span className={styles.badgeYellow} style={{ background: '#e0e7ff', color: '#4f46e5' }}>AI Processing</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardRow}>
                    <ShieldCheck size={14} color="#6366f1" />
                    <span>Analyzing Anomaly</span>
                  </div>
                  <div className={styles.cardRow}>
                    <Activity size={14} color="#6366f1" />
                    <span>Extracting Findings</span>
                  </div>
                </div>
              </div>

              <div className={styles.workflowCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.caseId}>Triage Complete</span>
                  <span className={styles.badgeGreen}>Reviewed</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardRow}>
                    <strong>Confidence:</strong> 92%
                  </div>
                  <div className={styles.cardRow}>
                    <strong>Clinician:</strong> Dr. Smith
                  </div>
                </div>
              </div>

            </div>
            <div className={styles.workflowFooter}>
              Powered by Multimodal GenAI
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
