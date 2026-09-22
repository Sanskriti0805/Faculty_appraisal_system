import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://' + window.location.hostname + ':5001/api'}`);

const CollegeAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const collegeToken = searchParams.get('token') || searchParams.get('sso_token') || searchParams.get('college_token');

    if (!collegeToken) {
      setError('No authentication token received from the college system. Please try logging in again via the main portal.');
      setLoading(false);
      return;
    }

    const processCollegeAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/college-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ college_token: collegeToken }),
        });

        const data = await res.json();

        if (data.success) {
          // Store authentication state
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify(data.user));

          // Refresh user context and navigate to dashboard
          await refreshUser();

          const redirectMap = {
            hod: '/hod/dashboard',
            faculty: '/',
            Dofa: '/Dofa/dashboard',
            Dofa_office: '/Dofa-office/dashboard',
          };
          
          navigate(redirectMap[data.user.role] || '/', { replace: true });
        } else {
          setError(data.message || 'Authentication failed. Please verify your credentials with the college portal.');
        }
      } catch (err) {
        console.error('College authentication error:', err);
        setError('Unable to connect to the Faculty Appraisal System authentication service. Please check network connection.');
      } finally {
        setLoading(false);
      }
    };

    processCollegeAuth();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#f8fafc',
      padding: '1.5rem'
    }}>
      <div style={{
        background: '#ffffff',
        color: '#0f172a',
        maxWidth: '440px',
        width: '100%',
        padding: '2.5rem',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        {loading ? (
          <div>
            <div style={{
              display: 'inline-flex',
              padding: '1rem',
              borderRadius: '50%',
              background: '#eff6ff',
              color: '#3b82f6',
              marginBottom: '1.25rem'
            }}>
              <RefreshCw size={36} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#1e293b' }}>
              Authenticating...
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
              Verifying your professor identity with the college portal.
            </p>
          </div>
        ) : error ? (
          <div>
            <div style={{
              display: 'inline-flex',
              padding: '1rem',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#ef4444',
              marginBottom: '1.25rem'
            }}>
              <AlertCircle size={36} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: '#991b1b' }}>
              Authentication Error
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: '#475569',
              margin: '0 0 1.5rem 0',
              lineHeight: 1.5,
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              textAlign: 'left'
            }}>
              {error}
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '0.75rem 1.25rem',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Return to Login Page
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'inline-flex',
              padding: '1rem',
              borderRadius: '50%',
              background: '#f0fdf4',
              color: '#16a34a',
              marginBottom: '1.25rem'
            }}>
              <ShieldCheck size={36} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#166534' }}>
              Verified
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
              Redirecting to your dashboard...
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CollegeAuthCallback;
