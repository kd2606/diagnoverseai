"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Activity } from 'lucide-react';
import styles from './landing.module.css';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navLogo}>
        <Activity size={28} />
        <span>DiagnoVerse AI</span>
      </div>
      
      <div className={styles.navLinks}>
        {/* Minimal navbar: inner links removed */}
      </div>

      <div className={styles.navRight}>
        <Link href="/auth/login" className={styles.navLink} style={{ marginRight: '1rem', fontWeight: 500 }}>Patient Portal</Link>
        <Link href="/auth/login" className={styles.btnPrimary} style={{ background: '#6366f1' }}>Clinician Portal</Link>
      </div>

      <button className={styles.mobileMenuBtn} onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className={styles.mobileDrawer}>
          <Link href="/auth/login" className={styles.navLink} onClick={() => setIsOpen(false)}>Patient Portal</Link>
          <Link href="/auth/login" className={styles.btnPrimary} style={{ textAlign: 'center', marginTop: '1rem', background: '#6366f1' }} onClick={() => setIsOpen(false)}>Clinician Portal</Link>
        </div>
      )}
    </nav>
  );
}
