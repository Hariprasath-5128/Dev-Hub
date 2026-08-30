import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './config/supabase';
import { restoreAuthToken, setAuthToken, clearAuthToken } from './utils/authToken';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import AdminDashboard from './components/AdminDashboard';
import Simulator from './components/Simulator';
import TargetedScan from './components/TargetedScan';
import IntegratedHealthAnalyzer from './components/IntegratedHealthAnalyzer';
import BlockchainResearch from './components/BlockchainResearch';
import HealthcarePolicy from './components/HealthcarePolicy';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Derived independently from whether a real token is actually present —
  // never trust a `hasToken` flag baked into an old localStorage user object
  // (e.g. a session created before token support existed, or an expired
  // token still sitting in storage would otherwise look "authenticated").
  const [hasToken, setHasToken] = useState(false);

  // Check if a user session exists in localStorage on app load
  useEffect(() => {
    const storedUser = localStorage.getItem('vg_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        const restored = restoreAuthToken(); // re-attach the Authorization header for this session
        setHasToken(Boolean(restored));
      } catch (e) {
        localStorage.removeItem('vg_user');
      }
    }
    setLoading(false);
  }, []);

  function handleLogin({ role, userId, username, token }) {
    const userData = { role, userId, username };
    setUser(userData);
    localStorage.setItem('vg_user', JSON.stringify(userData));
    if (token) {
      setAuthToken(token); // enables RBAC-protected endpoints (e.g. the chatbot)
      setHasToken(true);
    } else {
      clearAuthToken();
      setHasToken(false);
    }
  }

  async function handleLogout() {
    setUser(null);
    setHasToken(false);
    localStorage.removeItem('vg_user');
    clearAuthToken();
  }

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Login onLogin={handleLogin} />} />

        <Route
          path="/admin"
          element={
            user?.role === 'admin' ? (
              <AdminDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/doctor"
          element={
            user?.role === 'doctor' ? (
              <DoctorDashboard onLogout={handleLogout} hasToken={hasToken} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/patient"
          element={
            user?.role === 'patient' ? (
              <PatientDashboard userId={user.userId} onLogout={handleLogout} hasToken={hasToken} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/patient/simulator"
          element={
            user?.role === 'patient' ? (
              <Simulator />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/patient/scan"
          element={
            user?.role === 'patient' ? (
              <TargetedScan />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/research"
          element={
            user?.role === 'admin' ? (
              <BlockchainResearch />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/policy"
          element={
            user?.role === 'admin' ? (
              <HealthcarePolicy />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/health-analysis"
          element={
            <IntegratedHealthAnalyzer />
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </div>
  );
}
