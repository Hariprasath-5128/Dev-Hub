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
      setRole('patient'); // Default fallback
    }
  }, [email]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const lowerEmail = email.toLowerCase();

      // Check if this email has a specific role assignment
      if (userRoleMap[lowerEmail]) {
        const expectedRole = userRoleMap[lowerEmail];
        if (role !== expectedRole) {
          throw new Error(
            `⚠️ Email ${email} can only login as "${expectedRole.charAt(0).toUpperCase() + expectedRole.slice(1)}". Please select the correct role.`
          );
        }
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: lowerEmail,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Get the actual role from user metadata
        const userRole = data.user.user_metadata?.role || role;
        
        onLogin({ role: userRole, userId: data.user.id, email: data.user.email });
        navigate(`/${userRole}`);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const lowerEmail = email.toLowerCase();

      // Prevent signup with pre-assigned emails
      if (userRoleMap[lowerEmail]) {
        throw new Error(
          `This email (${email}) is already registered. Please login instead.`
        );
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: lowerEmail,
        password,
        options: {
          data: {
            role: role,
          },
        },
      });

      if (authError) throw authError;

      setError('');
      alert('✅ Sign up successful! You can now login with your credentials.');
      setIsSignUp(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <h1>VitalsGuard AI</h1>
        <p>{isSignUp ? 'Create Account' : 'Login'} as Hospital Admin, Doctor, or Patient</p>
        
        {error && <div className="error-message" style={{ color: '#fecaca', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#7f1d1d', borderRadius: '6px', fontSize: '0.9em', border: '1px solid #dc2626' }}>
          {error}
        </div>}

        {assignedRole && !isSignUp && (
          <div style={{ 
            color: '#dcfce7', 
            marginBottom: '1rem', 
            padding: '0.75rem', 
            backgroundColor: '#14532d', 
            borderRadius: '6px',
            fontSize: '0.9em',
            border: '1px solid #22c55e'
          }}>
            ✓ Role automatically assigned: <strong>{assignedRole.charAt(0).toUpperCase() + assignedRole.slice(1)}</strong>
          </div>
        )}
        
        <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
          <label>
            Role
            <select 
              value={role} 
              onChange={e => setRole(e.target.value)} 
              disabled={loading || (assignedRole && !isSignUp ? true : false)}
              style={{ opacity: assignedRole && !isSignUp ? 0.7 : 1, cursor: assignedRole && !isSignUp ? 'not-allowed' : 'pointer' }}
            >
              <option value="admin">Hospital Admin</option>
              <option value="doctor">Doctor</option>
              <option value="patient">Patient</option>
            </select>
            {assignedRole && !isSignUp && <small style={{ display: 'block', color: '#94a3b8', marginTop: '4px', fontSize: '0.8em' }}>✓ Auto-assigned role</small>}
          </label>
          
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={isSignUp ? 'Enter your email' : 'admin1@gmail.com'}
              disabled={loading}
              required
            />
          </label>
          
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isSignUp ? 'At least 6 characters' : 'Enter password'}
              disabled={loading}
              required
            />
          </label>
          
          <button type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Login')}
          </button>
        </form>

        {!isSignUp && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            backgroundColor: '#1a2f48', 
            borderRadius: '8px', 
            fontSize: '0.8em',
            border: '1px solid #2a4265'
          }}>
            <strong style={{ color: '#cbd5e1' }}>📋 Test Accounts:</strong>
            <div style={{ marginTop: '0.8rem', lineHeight: '1.8', color: '#cbd5e1' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: '#38bdf8' }}>👨‍💼 Admin:</span> admin1@gmail.com / admin1
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: '#38bdf8' }}>👨‍⚕️ Doctor:</span> doctor1@gmail.com / doctor1
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: '#38bdf8' }}>👨‍⚕️ Doctor:</span> doctor2@gmail.com / doctor2
              </div>
              <div>
                <span style={{ color: '#38bdf8' }}>👤 Patient:</span> patient1@gmail.com / patient1
              </div>
            </div>
          </div>
        )}
        
        <p style={{ marginTop: '1rem', textAlign: 'center', color: '#cbd5e1', fontSize: '0.9em' }}>
          {isSignUp ? 'Already have an account? ' : `Don't have an account? `}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setEmail('');
              setPassword('');
              setAssignedRole(null);
            }}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
              fontSize: 'inherit',
              fontWeight: '600'
            }}
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </section>
    </main>
  );
}
