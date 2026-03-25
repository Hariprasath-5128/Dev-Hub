'use client';

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from './Header';
import { Footer } from './Footer';
import { ShinyButton } from './ui/button';
import { Shield, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
function ElegantShape({
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "linear-gradient(135deg, rgba(16,185,129,0.48), rgba(167,243,208,0.34), rgba(255,255,255,0.24))",
  style,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -120, rotate: rotate - 12 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.1 },
      }}
      style={{ position: "absolute", ...style }}
    >
      <motion.div
        animate={{ y: [0, 16, 0] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        style={{ width, height, position: "relative" }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            background: gradient,
            border: "1.5px solid rgba(255,255,255,0.72)",
            boxShadow: "0 34px 90px rgba(16,185,129,0.3)",
            backdropFilter: "blur(10px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.56), rgba(209,250,229,0.18) 42%, transparent 70%)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

const medicalPolicies = [
  {
    id: 'hipaa',
    title: 'HIPAA Compliance Protocol',
    subtitle: 'Health Insurance Portability and Accountability Act',
    description: 'Establishment of national standards for electronic healthcare transactions and code sets, unique health identifiers, and security.',
    status: 'Active',
    lastReview: 'March 2026',
    provisions: ['Protected Health Information (PHI) Security', 'Patient Privacy Rights Management', 'Electronic Submission Standards'],
    color: '#10b981'
  },
  {
    id: 'gdpr',
    title: 'GDPR Data Sovereignty',
    subtitle: 'General Data Protection Regulation',
    description: 'Comprehensive data protection and privacy framework for clinical care nodes operating within or processing data of EU citizens.',
    status: 'Compliant',
    lastReview: 'February 2026',
    provisions: ['Right to Erasure (RTBF)', 'Clinical Data Anonymization', 'Cross-border Transfer Protocols'],
    color: '#3b82f6'
  },
  {
    id: 'hitech',
    title: 'HITECH Clinical Guard',
    subtitle: 'Health Information Technology for Economic and Clinical Health',
    description: 'Enhancing the privacy and security protections of health information through the promotion and meaningful use of health IT.',
    status: 'Verified',
    lastReview: 'January 2026',
    provisions: ['Breach Notification Automation', 'Electronic Health Record (EHR) Security', 'Audit Trail Enforcement'],
    color: '#8b5cf6'
  },
  {
    id: 'soc2',
    title: 'SOC-2 Type II Certification',
    subtitle: 'System and Organization Controls',
    description: 'Verification of administrative control systems based on Five Trust Services Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy.',
    status: 'Certified',
    lastReview: 'March 2026',
    provisions: ['Continuous Monitoring', 'Risk Mitigation Framework', 'Infrastructure Hardening'],
    color: '#f59e0b'
  },
  {
    id: 'ccpa',
    title: 'CCPA Medical Privacy v2.0',
    subtitle: 'California Consumer Privacy Act',
    description: 'State-level consumer protection and privacy rights for patient data ownership and transparency in clinical synthesis.',
    status: 'Active',
    lastReview: 'December 2025',
    provisions: ['Right to Opt-out', 'Data Inventory Mapping', 'Identity Verification Checks'],
    color: '#ef4444'
  },
  {
    id: 'iso27001',
    title: 'ISO 27001 ISMS Standard',
    subtitle: 'Information Security Management System',
    description: 'International standard on how to manage information security, specifying a set of best practices and controls.',
    status: 'Gold Standard',
    lastReview: 'February 2026',
    provisions: ['Global Risk Assessment', 'Personnel Training Compliance', 'Physical Node Security'],
    color: '#10b981'
  }
];

export default function HealthcarePolicy() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden', color: '#1e293b', fontFamily: "'Inter', sans-serif", background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 34%, #ecfdf5 62%, #f0fdf4 100%)" }}>
      
      {/* High-Fidelity Geometry Background Layer (Login style) */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top left, rgba(16,185,129,0.36), transparent 34%), radial-gradient(circle at left center, rgba(52,211,153,0.22), transparent 42%), radial-gradient(circle at center center, rgba(16,185,129,0.12), transparent 46%), radial-gradient(circle at top right, rgba(52,211,153,0.14), transparent 34%), radial-gradient(circle at bottom left, rgba(16,185,129,0.18), transparent 32%), radial-gradient(circle at bottom right, rgba(134,215,195,0.12), transparent 26%)",
          }}
        />
        <ElegantShape
          delay={0.2}
          width={620}
          height={138}
          rotate={12}
          gradient="linear-gradient(135deg, rgba(16,185,129,0.42), rgba(167,243,208,0.28), rgba(255,255,255,0.2))"
          style={{ left: "-6%", top: "12%" }}
        />
        <ElegantShape
          delay={0.35}
          width={360}
          height={92}
          rotate={-18}
          gradient="linear-gradient(135deg, rgba(20,184,166,0.32), rgba(255,255,255,0.26))"
          style={{ right: "2%", top: "16%" }}
        />
        <ElegantShape
          delay={0.5}
          width={420}
          height={108}
          rotate={-10}
          gradient="linear-gradient(135deg, rgba(5,150,105,0.28), rgba(209,250,229,0.18), rgba(255,255,255,0.2))"
          style={{ left: "8%", bottom: "16%" }}
        />
        <ElegantShape
          delay={0.65}
          width={240}
          height={70}
          rotate={20}
          gradient="linear-gradient(135deg, rgba(255,255,255,0.28), rgba(16,185,129,0.32), rgba(167,243,208,0.18))"
          style={{ right: "12%", bottom: "12%" }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 10 }}>
        <Header 
          links={[
            { label: 'Overview', href: '/admin' },
            { label: 'Research', href: '/admin/research' },
            { label: 'Policy', href: '/admin/policy' },
          ]}
        />

        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '4rem', textAlign: 'center', alignItems: 'center' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.2 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', width: 'fit-content' }}
            >
              <Shield style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.15em', color: '#1e40af', textTransform: 'uppercase' }}>Medical Data Sovereignty</span>
            </motion.div>
            
            <div style={{ maxWidth: '800px' }}>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                style={{ fontSize: '3.5rem', fontWeight: '900', letterSpacing: '-0.04em', color: '#0f172a', margin: '0 0 1rem 0', lineHeight: '1.1' }}
              >
                Institutional Policy & <span style={{ color: '#10b981' }}>Compliance</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ delay: 0.1 }}
                style={{ fontSize: '1.2rem', color: '#475569', margin: '0', lineHeight: '1.6', fontWeight: '500' }}
              >
                Access the master repository of global clinical standards and medical auditing protocols.
              </motion.p>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.2 }} transition={{ delay: 0.2 }}>
              <ShinyButton
                variant="green"
                onClick={() => navigate('/admin')}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Dashboard
              </ShinyButton>
            </motion.div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            {medicalPolicies.map((policy, i) => (
              <motion.div
                key={policy.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.82)',
                  backdropFilter: 'blur(16px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.7)',
                  borderRadius: '32px',
                  padding: '2.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(16, 185, 129, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.7)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0,0,0,0.05)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ padding: '12px', borderRadius: '16px', background: `${policy.color}15`, color: policy.color }}>
                    <FileText style={{ width: '24px', height: '24px' }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: '800', color: policy.color, background: `${policy.color}10`, padding: '4px 12px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {policy.status}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0' }}>{policy.title}</h3>
                  <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em', margin: '0' }}>{policy.subtitle}</p>
                </div>

                <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.6', margin: '0' }}>{policy.description}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Key Provisions</p>
                  {policy.provisions.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CheckCircle2 style={{ width: '14px', height: '14px', color: '#10b981' }} />
                      <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>{item}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Certified Last</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>{policy.lastReview}</span>
                  </div>
                  <ShinyButton variant="white" className="h-9 px-4 text-xs font-bold border-none shadow-none">
                    Review Docs
                  </ShinyButton>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Global Compliance Summary Container */}
          <motion.div
             initial={{ opacity: 0, y: 40 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: false, amount: 0.1 }}
             style={{
               marginTop: '4rem',
               padding: '3rem',
               borderRadius: '40px',
               background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
               color: 'white',
               display: 'flex',
               flexWrap: 'wrap',
               justifyContent: 'space-between',
               alignItems: 'center',
               gap: '2rem'
             }}
          >
            <div style={{ flex: '1 1 500px' }}>
              <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: '0 0 1rem 0', letterSpacing: '-0.02em' }}>Unified Institutional Guard</h2>
              <p style={{ fontSize: '1.1rem', color: '#94a3b8', margin: '0', lineHeight: '1.6' }}>Global certification nodes synchronized across Mainnet-01 and clinical care protocols.</p>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
               <div style={{ textAlign: 'center', padding: '1.5rem 2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
                 <p style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981', margin: '0' }}>100%</p>
                 <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', margin: '0' }}>HIPAA Secured</p>
               </div>
               <div style={{ textAlign: 'center', padding: '1.5rem 2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
                 <p style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981', margin: '0' }}>Zero</p>
                 <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', margin: '0' }}>Breach Alerts</p>
               </div>
            </div>
          </motion.div>
        </main>
        <Footer 
          links={[
            { label: 'Home', href: '/' },
            { label: 'Dashboard', href: '/admin' },
            { label: 'Research', href: '/admin/research' },
            { label: 'Policy', href: '/admin/policy' },
          ]}
        />
      </div>
    </div>
  );
}
