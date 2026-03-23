import React from 'react';
import { patients } from '../data/mockVitals';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

export default function AdminDashboard({ onLogout }) {
  const counts = patients.reduce(
    (acc, patient) => {
      acc[patient.vitals[patient.vitals.length - 1].status] += 1;
      return acc;
    },
    { stable: 0, warning: 0, critical: 0 }
  );

  const chartData = [
    { name: 'Stable', value: counts.stable },
    { name: 'Warning', value: counts.warning },
    { name: 'Critical', value: counts.critical }
  ];

  const COLORS = ['#10b981', '#f97316', '#dc2626'];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Header */}
      <header style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🏥</span>
            <h1 style={{ color: '#7C3AED', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Hospital Administration</h1>
          </div>
          <button onClick={onLogout} style={{ padding: '0.6rem 1.2rem', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #3B82F6' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px', fontWeight: '600' }}>👥 ACTIVE PATIENTS</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3B82F6' }}>{patients.length}</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #F97316' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px', fontWeight: '600' }}>⚠️ WARNINGS</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#F97316' }}>{counts.warning}</div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #DC2626' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px', fontWeight: '600' }}>🚨 CRITICAL</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#DC2626' }}>{counts.critical}</div>
          </div>
        </div>

        {/* Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Pie Chart */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h3 style={{ color: '#7C3AED', margin: '0 0 1.5rem 0' }}>📊 Patient Status Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie dataKey="value" data={chartData} cx="50%" cy="50%" outerRadius={80} label>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Card */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h3 style={{ color: '#7C3AED', margin: '0 0 1.5rem 0' }}>📈 System Health</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#666', fontSize: '0.9rem' }}>System Uptime</span>
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>99.9%</span>
                </div>
                <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#10b981', width: '99.9%' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#666', fontSize: '0.9rem' }}>Data Sync Status</span>
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>Real-time</span>
                </div>
                <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#10b981', width: '100%' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#666', fontSize: '0.9rem' }}>Average Response Time</span>
                  <span style={{ fontWeight: 'bold', color: '#3B82F6' }}>245ms</span>
                </div>
                <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#3B82F6', width: '85%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Analytics */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
          <h3 style={{ color: '#7C3AED', margin: '0 0 1.5rem 0' }}>🤖 AI Insights & Analytics</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#666', lineHeight: '1.8' }}>
            <li>Real-time pattern detection across {patients.length} active patients</li>
            <li>Predictive health alerts reduced false positives by 34%</li>
            <li>Average patient recovery time improved by 12% with AI intervention</li>
            <li>Clinical decision support active for all high-risk cases</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ textAlign: 'center' }}>
          <Link to="/admin/policy" style={{ backgroundColor: '#7C3AED', color: 'white', padding: '0.8rem 2rem', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', display: 'inline-block' }}>
            🔐 Manage Access & Settings
          </Link>
        </div>
      </main>
    </div>
  );
}
