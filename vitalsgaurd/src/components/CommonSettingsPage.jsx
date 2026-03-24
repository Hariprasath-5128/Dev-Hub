import React, { useEffect, useMemo, useState } from 'react';

const baseSettings = {
  profile: {
    displayName: '',
    email: '',
    phone: ''
  },
  notifications: {
    emailAlerts: true,
    smsAlerts: false,
    pushAlerts: true,
    criticalOnly: true
  },
  system: {
    autoRefreshSeconds: 15,
    language: 'English',
    compactMode: false
  },
  security: {
    twoFactor: false,
    sessionTimeoutMinutes: 30
  },
  adminInfrastructure: {
    hospitalName: 'VitalsGuard General Hospital',
    campus: 'Main Campus',
    totalBeds: 300,
    icuBeds: 24,
    emergencyCapacity: 40,
    oxygenPlantStatus: 'Operational',
    generatorBackupHours: 18,
    kitchenServiceWindow: '06:00-22:00'
  }
};

function readSettings(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

export default function CommonSettingsPage({ role, onBack }) {
  const storageKey = useMemo(() => `vg_settings_${role}`, [role]);
  const [settings, setSettings] = useState(baseSettings);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    const existing = readSettings(storageKey);
    if (existing) {
      setSettings({
        ...baseSettings,
        ...existing,
        profile: { ...baseSettings.profile, ...(existing.profile || {}) },
        notifications: { ...baseSettings.notifications, ...(existing.notifications || {}) },
        system: { ...baseSettings.system, ...(existing.system || {}) },
        security: { ...baseSettings.security, ...(existing.security || {}) },
        adminInfrastructure: { ...baseSettings.adminInfrastructure, ...(existing.adminInfrastructure || {}) }
      });
    }
  }, [storageKey]);

  const setNested = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setSaved('');
  };

  const saveSettings = () => {
    localStorage.setItem(storageKey, JSON.stringify(settings));
    setSaved('Settings saved successfully.');
  };

  const roleLabel = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'User';

  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <h3 style={{ margin: 0, color: '#7C3AED', fontSize: '1.25rem' }}>Settings - {roleLabel}</h3>
        {onBack && (
          <button onClick={onBack} style={{ border: 'none', borderRadius: '8px', padding: '0.5rem 0.85rem', fontWeight: 700, cursor: 'pointer', color: '#5b21b6', background: '#ede9fe' }}>
            Back
          </button>
        )}
      </div>

      {saved && (
        <div style={{ marginBottom: '1rem', background: '#ecfdf5', color: '#166534', border: '1px solid #86efac', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.88rem' }}>
          {saved}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
          <h4 style={{ margin: '0 0 0.8rem 0', color: '#4c1d95' }}>Profile</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <input value={settings.profile.displayName} onChange={(e) => setNested('profile', 'displayName', e.target.value)} placeholder="Display name" style={{ padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <input value={settings.profile.email} onChange={(e) => setNested('profile', 'email', e.target.value)} placeholder="Email" style={{ padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <input value={settings.profile.phone} onChange={(e) => setNested('profile', 'phone', e.target.value)} placeholder="Phone" style={{ padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
        </section>

        <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
          <h4 style={{ margin: '0 0 0.8rem 0', color: '#4c1d95' }}>Notifications</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem', fontSize: '0.9rem' }}>
            <label><input type="checkbox" checked={settings.notifications.emailAlerts} onChange={(e) => setNested('notifications', 'emailAlerts', e.target.checked)} /> Email alerts</label>
            <label><input type="checkbox" checked={settings.notifications.smsAlerts} onChange={(e) => setNested('notifications', 'smsAlerts', e.target.checked)} /> SMS alerts</label>
            <label><input type="checkbox" checked={settings.notifications.pushAlerts} onChange={(e) => setNested('notifications', 'pushAlerts', e.target.checked)} /> Push alerts</label>
            <label><input type="checkbox" checked={settings.notifications.criticalOnly} onChange={(e) => setNested('notifications', 'criticalOnly', e.target.checked)} /> Critical only</label>
          </div>
        </section>

        <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
          <h4 style={{ margin: '0 0 0.8rem 0', color: '#4c1d95' }}>System</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', fontSize: '0.9rem' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.7rem' }}>
              Auto refresh (seconds)
              <input type="number" min="5" max="300" value={settings.system.autoRefreshSeconds} onChange={(e) => setNested('system', 'autoRefreshSeconds', Number(e.target.value) || 15)} style={{ width: '90px', padding: '0.35rem 0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </label>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.7rem' }}>
              Language
              <select value={settings.system.language} onChange={(e) => setNested('system', 'language', e.target.value)} style={{ width: '160px', padding: '0.35rem 0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="English">English</option>
                <option value="Tamil">Tamil</option>
                <option value="Hindi">Hindi</option>
              </select>
            </label>
            <label><input type="checkbox" checked={settings.system.compactMode} onChange={(e) => setNested('system', 'compactMode', e.target.checked)} /> Compact mode</label>
          </div>
        </section>

        <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
          <h4 style={{ margin: '0 0 0.8rem 0', color: '#4c1d95' }}>Security</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', fontSize: '0.9rem' }}>
            <label><input type="checkbox" checked={settings.security.twoFactor} onChange={(e) => setNested('security', 'twoFactor', e.target.checked)} /> Enable two-factor authentication</label>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.7rem' }}>
              Session timeout (minutes)
              <input type="number" min="5" max="240" value={settings.security.sessionTimeoutMinutes} onChange={(e) => setNested('security', 'sessionTimeoutMinutes', Number(e.target.value) || 30)} style={{ width: '90px', padding: '0.35rem 0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </label>
          </div>
        </section>

        {role === 'admin' && (
          <section style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', gridColumn: '1 / span 2' }}>
            <h4 style={{ margin: '0 0 0.8rem 0', color: '#4c1d95' }}>Hospital Infrastructure</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))', gap: '0.7rem' }}>
              <input value={settings.adminInfrastructure.hospitalName} onChange={(e) => setNested('adminInfrastructure', 'hospitalName', e.target.value)} placeholder="Hospital name" style={{ padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input value={settings.adminInfrastructure.campus} onChange={(e) => setNested('adminInfrastructure', 'campus', e.target.value)} placeholder="Campus" style={{ padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="number" min="1" value={settings.adminInfrastructure.totalBeds} onChange={(e) => setNested('adminInfrastructure', 'totalBeds', Number(e.target.value) || 0)} placeholder="Total beds" style={{ padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="number" min="0" value={settings.adminInfrastructure.icuBeds} onChange={(e) => setNested('adminInfrastructure', 'icuBeds', Number(e.target.value) || 0)} placeholder="ICU beds" style={{ padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="number" min="0" value={settings.adminInfrastructure.emergencyCapacity} onChange={(e) => setNested('adminInfrastructure', 'emergencyCapacity', Number(e.target.value) || 0)} placeholder="Emergency capacity" style={{ padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input value={settings.adminInfrastructure.oxygenPlantStatus} onChange={(e) => setNested('adminInfrastructure', 'oxygenPlantStatus', e.target.value)} placeholder="Oxygen plant status" style={{ padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="number" min="0" value={settings.adminInfrastructure.generatorBackupHours} onChange={(e) => setNested('adminInfrastructure', 'generatorBackupHours', Number(e.target.value) || 0)} placeholder="Generator backup (hours)" style={{ padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input value={settings.adminInfrastructure.kitchenServiceWindow} onChange={(e) => setNested('adminInfrastructure', 'kitchenServiceWindow', e.target.value)} placeholder="Kitchen service window" style={{ padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
          </section>
        )}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={saveSettings} style={{ border: 'none', borderRadius: '8px', padding: '0.6rem 1rem', background: '#7C3AED', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          Save Settings
        </button>
      </div>
    </div>
  );
}