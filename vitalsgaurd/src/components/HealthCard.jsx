import React from 'react';

export default function HealthCard({ title, value, unit, severity, icon }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(121, 184, 255, 0.25)',
      borderRadius: '24px',
      padding: '1.5rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      boxShadow: '0 10px 25px rgba(15, 45, 88, 0.05)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}>
      <div style={{ fontSize: '2.4rem', marginBottom: '0.6rem' }}>{icon}</div>
      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '2.2rem', color: '#173b67', fontWeight: '900', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: '#5f7fa6', marginTop: '0.35rem', fontWeight: '600' }}>{unit}</div>
    </div>
  );
}