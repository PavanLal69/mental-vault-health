import React, { useState } from 'react';
import axios from 'axios';
import { LogIn, UserPlus, Shield, Heart } from 'lucide-react';
import { API_URL } from '../config';

export default function Login({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('contributor'); // 'contributor' or 'elderly'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const baseUrl = `${API_URL}/api`;

    try {
      if (isLogin) {
        const response = await axios.post(`${baseUrl}/auth/login`, {
          email,
          password,
        });
        onAuthSuccess(response.data.token, response.data.user);
      } else {
        const response = await axios.post(`${baseUrl}/auth/register`, {
          email,
          password,
          name,
          role,
        });
        onAuthSuccess(response.data.token, response.data.user);
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || 'Authentication failed. Please verify credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 120px)',
      padding: '2rem'
    }}>
      <div className="glass-card" style={{ maxWidth: '480px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '1rem',
            background: 'var(--accent-soft)',
            borderRadius: '50%',
            color: 'var(--accent-primary)',
            marginBottom: '1rem'
          }}>
            <Heart size={36} fill="currentColor" />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {isLogin ? 'Welcome Back' : 'Create Family Vault'}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isLogin 
              ? 'Sign in to access and share precious family memories.' 
              : 'Start a private vault to safeguard family stories and media.'
            }
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(185, 28, 28, 0.1)',
            borderLeft: '4px solid var(--danger)',
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.95rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {!isLogin && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Grandma Helen or Grandson Jack"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="family@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Your Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  backgroundColor: role === 'contributor' ? 'var(--accent-soft)' : 'transparent',
                  borderColor: role === 'contributor' ? 'var(--accent-primary)' : 'var(--border-glass)'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="contributor"
                    checked={role === 'contributor'}
                    onChange={() => setRole('contributor')}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>Family Helper</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Uploads memories</span>
                  </div>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  backgroundColor: role === 'elderly' ? 'var(--accent-soft)' : 'transparent',
                  borderColor: role === 'elderly' ? 'var(--accent-primary)' : 'var(--border-glass)'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="elderly"
                    checked={role === 'elderly'}
                    onChange={() => setRole('elderly')}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>Elderly Viewer</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Simplified experience</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Vault')}
            {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-primary)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            {isLogin ? "Need a family vault? Register here" : "Already have a vault? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
