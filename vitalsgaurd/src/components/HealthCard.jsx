import React from 'react';

export default function HealthCard({ title, value, unit, severity, icon }) {
  return (
    <div style={{
      background: 'linear-gradient(150deg, rgba(255,255,255,0.85) 0%, rgba(207,229,255,0.6) 55%, rgba(225,214,255,0.5) 100%)',
      backdropFilter: 'blur(30px) saturate(160%)',
      WebkitBackdropFilter: 'blur(30px) saturate(160%)',
      border: '1px solid rgba(59,130,246,0.25)',
      borderRadius: '24px',
      padding: '1.5rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      boxShadow: '0 10px 40px rgba(23,59,103,0.06)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}>
      <div style={{ marginBottom: '0.8rem', display: 'grid', placeItems: 'center', minHeight: '48px' }}>{icon}</div>
      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '2.2rem', color: '#173b67', fontWeight: '900', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: '#5f7fa6', marginTop: '0.35rem', fontWeight: '600' }}>{unit}</div>
    </div>
  );
}
