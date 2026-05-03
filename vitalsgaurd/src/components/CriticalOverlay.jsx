import React from 'react';

export default function CriticalOverlay({ active, message, onResolve }) {
  if (!active) return null;
  return (
    <section className="critical-overlay">
      <div className="critical-content">
        <h2>🚨 Emergency Mode Active</h2>
        <p>{message}</p>
        <button onClick={onResolve}>Acknowledge &amp; Resolve</button>
      </div>
    </section>
  );
}
