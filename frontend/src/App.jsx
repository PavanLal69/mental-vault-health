import React, { useState, useEffect } from 'react';
import { Heart, TreePine, Upload, Mic, Settings, LogOut, Sun, Moon, Sparkles } from 'lucide-react';
import Login from './components/Login';
import MemoryFeed from './components/MemoryFeed';
import FamilyTree from './components/FamilyTree';
import UploadMemory from './components/UploadMemory';
import VoiceAssistant from './components/VoiceAssistant';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeTab, setActiveTab] = useState('feed');
  const [textScale, setTextScale] = useState(parseFloat(localStorage.getItem('textScale') || '1'));
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  // Handle Authentication Success
  const handleAuthSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // Handle Logout
  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Adjust Text Scale (Accessibility)
  const adjustTextScale = (scale) => {
    setTextScale(scale);
    localStorage.setItem('textScale', scale.toString());
  };

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', (!darkMode).toString());
  };

  // Apply visual styling properties
  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', textScale.toString());
  }, [textScale]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Render components according to active selection
  const renderContent = () => {
    if (!token) {
      return <Login onAuthSuccess={handleAuthSuccess} />;
    }

    switch (activeTab) {
      case 'feed':
        return <MemoryFeed role={user?.role} />;
      case 'tree':
        return <FamilyTree token={token} />;
      case 'upload':
        return <UploadMemory token={token} onUploadSuccess={() => setActiveTab('feed')} />;
      case 'voice':
        return <VoiceAssistant />;
      default:
        return <MemoryFeed role={user?.role} />;
    }
  };

  return (
    <div className="app-container">
      {/* Accessibility Adjustment Bar */}
      <div className="accessibility-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
          <Sparkles size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
            Elderly Accessibility Controls:
          </span>
        </div>
        
        {/* Text Size Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Text Size:</span>
          <button 
            onClick={() => adjustTextScale(1)} 
            style={{
              border: textScale === 1 ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
              backgroundColor: textScale === 1 ? 'var(--accent-soft)' : 'var(--bg-secondary)',
              padding: '4px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85rem'
            }}
          >
            A
          </button>
          <button 
            onClick={() => adjustTextScale(1.25)} 
            style={{
              border: textScale === 1.25 ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
              backgroundColor: textScale === 1.25 ? 'var(--accent-soft)' : 'var(--bg-secondary)',
              padding: '4px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            A+
          </button>
          <button 
            onClick={() => adjustTextScale(1.5)} 
            style={{
              border: textScale === 1.5 ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
              backgroundColor: textScale === 1.5 ? 'var(--accent-soft)' : 'var(--bg-secondary)',
              padding: '4px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1.15rem'
            }}
          >
            A++
          </button>
        </div>

        {/* Theme Toggler */}
        <button 
          onClick={toggleDarkMode}
          style={{
            background: 'none',
            border: '1px solid var(--border-glass)',
            padding: '6px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-secondary)'
          }}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Main Header / Navigation */}
      {token && (
        <nav className="navbar">
          <div className="nav-logo" onClick={() => setActiveTab('feed')}>
            <Heart size={26} fill="var(--accent-primary)" color="var(--accent-primary)" />
            <span>Memory Vault</span>
          </div>

          <ul className="nav-links">
            <li>
              <button 
                onClick={() => setActiveTab('feed')} 
                className={`nav-link ${activeTab === 'feed' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none' }}
              >
                <Heart size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Memories
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('tree')} 
                className={`nav-link ${activeTab === 'tree' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none' }}
              >
                <TreePine size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Family Tree
              </button>
            </li>
            
            {/* Limit certain panels if user is marked as simplified elderly view */}
            {user?.role !== 'elderly' && (
              <li>
                <button 
                  onClick={() => setActiveTab('upload')} 
                  className={`nav-link ${activeTab === 'upload' ? 'active' : ''}`}
                  style={{ background: 'none', border: 'none' }}
                >
                  <Upload size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Add Memory
                </button>
              </li>
            )}

            <li>
              <button 
                onClick={() => setActiveTab('voice')} 
                className={`nav-link ${activeTab === 'voice' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none' }}
              >
                <Mic size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Ask Assistant
              </button>
            </li>

            <li style={{ borderLeft: '1px solid var(--border-glass)', paddingLeft: '20px', marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{user?.name}</span>
              <button 
                onClick={handleLogout} 
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px'
                }}
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Main Core Display Workspace */}
      <main style={{ flexGrow: 1 }}>
        {renderContent()}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '2rem',
        borderTop: '1px solid var(--border-glass)',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        Memory Vault &copy; {new Date().getFullYear()} &middot; Safeguarding precious life stories.
      </footer>
    </div>
  );
}
