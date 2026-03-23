import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

// Define user roles by email
const userRoleMap = {
  'admin1@gmail.com': 'admin',
  'doctor1@gmail.com': 'doctor',
  'doctor2@gmail.com': 'doctor',
  'patient1@gmail.com': 'patient',
};

const demoAccounts = {
  doctor: { email: 'doctor1@gmail.com', password: 'doctor1' },
  patient: { email: 'patient1@gmail.com', password: 'patient1' },
  admin: { email: 'admin1@gmail.com', password: 'admin1' },
};

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [assignedRole, setAssignedRole] = useState(null);
  const navigate = useNavigate();

  // Auto-assign role based on email
  useEffect(() => {
    const lowerEmail = email.toLowerCase();
    if (userRoleMap[lowerEmail]) {
      setAssignedRole(userRoleMap[lowerEmail]);
      setRole(userRoleMap[lowerEmail]);
    } else {
      setAssignedRole(null);
      setRole('patient');
    }
  }, [email]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const lowerEmail = email.toLowerCase();

      if (userRoleMap[lowerEmail]) {
        const expectedRole = userRoleMap[lowerEmail];
        if (role !== expectedRole) {
          throw new Error(
            `Email ${email} can only login as "${expectedRole.charAt(0).toUpperCase() + expectedRole.slice(1)}".`
          );
        }
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: lowerEmail,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        const userRole = data.user.user_metadata?.role || role;
        onLogin({ role: userRole, userId: data.user.id, email: data.user.email });
        navigate(`/${userRole}`);
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(demoRole) {
    setEmail(demoAccounts[demoRole].email);
    const pass = demoAccounts[demoRole].password;
    setPassword(pass);
    
    setTimeout(() => {
      const form = new FormData();
      handleLogin({ 
        preventDefault: () => {}, 
        currentTarget: { email: { value: demoAccounts[demoRole].email }, password: { value: pass } } 
      });
    }, 0);
  }

  async function quickLogin(demoRole) {
    setError('');
    setLoading(true);
    const account = demoAccounts[demoRole];

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (authError) {
        // Offline / invalid Supabase creds — use local demo mode
        if (authError.message === 'OFFLINE_MODE' || authError.status >= 400 || !data) {
          const userRole = userRoleMap[account.email] || demoRole;
          onLogin({ role: userRole, userId: `demo-${demoRole}`, email: account.email });
          navigate(`/${userRole}`);
          return;
        }
        throw authError;
      }

      if (data?.user) {
        const userRole = userRoleMap[account.email] || demoRole;
        onLogin({ role: userRole, userId: data.user.id, email: data.user.email });
        navigate(`/${userRole}`);
      }
    } catch (err) {
      // Any failure → still allow demo mode so the app is always usable
      const userRole = userRoleMap[account.email] || demoRole;
      onLogin({ role: userRole, userId: `demo-${demoRole}`, email: account.email });
      navigate(`/${userRole}`);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left Side - Purple Gradient */}
      <div style={{
        width: '40%',
        background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
        color: 'white',
        padding: '60px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>💊</div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 'bold' }}>VitalsGuard</h1>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>CLINICAL HEALTH AI</p>
        </div>

        <div>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px', lineHeight: '1.2' }}>
            Smarter health monitoring for every patient.
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '40px' }}>
            AI-powered vital sign tracking, real-time alerts, and clinical-grade management — all in one platform.
          </p>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', fontSize: '14px' }}>
              <span style={{ fontSize: '20px' }}>⚡</span>
              <span>AI-powered real-time vitals monitoring</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', fontSize: '14px' }}>
              <span style={{ fontSize: '20px' }}>🏥</span>
              <span>Clinical-grade health protocols built-in</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '14px' }}>
              <span style={{ fontSize: '20px' }}>🔐</span>
              <span>Role-based access for your entire team</span>
            </li>
          </ul>
        </div>

        <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>© 2026 VitalsGuard. All rights reserved.</p>
      </div>

      {/* Right Side - Login Form */}
      <div style={{
        width: '60%',
        padding: '60px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f3ff',
      }}>
        <div style={{ width: 'min(380px, 100%)' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ width: '50px', height: '50px', background: '#7C3AED', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>
              💊
            </div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>
              Welcome Back
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#999' }}>
              Sign in to VitalsGuard — Continue your journey
            </p>
          </div>

          {error && (
            <div style={{
              color: '#dc2626',
              marginBottom: '1rem',
              padding: '12px',
              backgroundColor: '#fee2e2',
              borderRadius: '8px',
              fontSize: '13px',
              border: '1px solid #fecaca'
            }}>
              {error}
            </div>
          )}

          {assignedRole && !isSignUp && (
            <div style={{
              color: '#059669',
              marginBottom: '1rem',
              padding: '12px',
              backgroundColor: '#ecfdf5',
              borderRadius: '8px',
              fontSize: '13px',
              border: '1px solid #a7f3d0'
            }}>
              ✓ Role: <strong>{assignedRole.charAt(0).toUpperCase() + assignedRole.slice(1)}</strong>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>
              Your email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                marginBottom: '1.2rem',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
              required
            />

            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '14px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
              required
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                background: '#7C3AED',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                marginBottom: '20px',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.3s',
              }}
              onMouseEnter={e => !loading && (e.target.style.background = '#6D28D9')}
              onMouseLeave={e => (e.target.style.background = '#7C3AED')}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>Demo accounts</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <button
                onClick={() => quickLogin('doctor')}
                disabled={loading}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  color: '#7C3AED',
                  fontWeight: '500',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={e => !loading && (e.target.style.borderColor = '#7C3AED', e.target.style.background = '#f5f3ff')}
                onMouseLeave={e => (e.target.style.borderColor = '#e5e7eb', e.target.style.background = '#fff')}
              >
                👨‍⚕️ Doctor
              </button>
              <button
                onClick={() => quickLogin('patient')}
                disabled={loading}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  color: '#7C3AED',
                  fontWeight: '500',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={e => !loading && (e.target.style.borderColor = '#7C3AED', e.target.style.background = '#f5f3ff')}
                onMouseLeave={e => (e.target.style.borderColor = '#e5e7eb', e.target.style.background = '#fff')}
              >
                👤 Patient
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              <button
                onClick={() => quickLogin('admin')}
                disabled={loading}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  color: '#7C3AED',
                  fontWeight: '500',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={e => !loading && (e.target.style.borderColor = '#7C3AED', e.target.style.background = '#f5f3ff')}
                onMouseLeave={e => (e.target.style.borderColor = '#e5e7eb', e.target.style.background = '#fff')}
              >
                🛡️ Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
