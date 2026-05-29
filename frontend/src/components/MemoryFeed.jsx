import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Heart, Sparkles, Volume2, Calendar, FileText, X, Image, VolumeX } from 'lucide-react';

export default function MemoryFeed({ role }) {
  const [memories, setMemories] = useState([]);
  const [dailyMemory, setDailyMemory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const categories = ['All', 'Childhood', 'Education', 'Career', 'Marriage', 'Family', 'Travel', 'Holiday', 'Other'];

  useEffect(() => {
    fetchMemories();
    fetchDailyMemory();
  }, []);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/memories');
      setMemories(res.data);
    } catch (err) {
      console.error('Error fetching memories:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyMemory = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/memories/daily');
      setDailyMemory(res.data);
    } catch (err) {
      console.error('Error fetching daily memory:', err);
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchMemories();
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/memories/search?q=${encodeURIComponent(searchQuery)}`);
      setMemories(res.data);
    } catch (err) {
      console.error('Error performing semantic search:', err);
    } finally {
      setLoading(false);
    }
  };

  const readAloud = (text, id) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85; // slower for elderly accessibility
    utterance.pitch = 1.05;
    
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const filteredMemories = activeCategory === 'All'
    ? memories
    : memories.filter(m => m.category === activeCategory);

  const getFullMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `http://localhost:5000${url}`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      
      {/* Search Bar section */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', width: '100%' }}>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <Search size={22} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search memories (e.g. 'Show our trips to Paris', 'Grandma graduation')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '48px', height: '54px', borderRadius: '9999px' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ padding: '0 32px', height: '54px' }}>
          Search
        </button>
      </form>

      {/* Daily Memory Hero Box (accessibility-focused for elderly) */}
      {dailyMemory && activeCategory === 'All' && !searchQuery && (
        <div className="glass-card" style={{
          border: '2px solid var(--accent-primary)',
          position: 'relative',
          padding: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: dailyMemory.media_url ? '1fr 1fr' : '1fr',
          minHeight: '340px'
        }}>
          {dailyMemory.media_url && (
            <div style={{ height: '100%', minHeight: '300px', position: 'relative' }}>
              <img
                src={getFullMediaUrl(dailyMemory.media_url)}
                alt={dailyMemory.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <span style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Sparkles size={14} /> Today's Featured Memory
              </span>
            </div>
          )}

          <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
            {!dailyMemory.media_url && (
              <span style={{
                alignSelf: 'flex-start',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                marginBottom: '0.5rem'
              }}>
                🔑 Today's Featured Memory
              </span>
            )}
            <span className="memory-category" style={{ alignSelf: 'flex-start' }}>{dailyMemory.category}</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800' }}>{dailyMemory.title}</h2>
            {dailyMemory.event_date && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} /> {dailyMemory.event_date}
              </p>
            )}
            
            <div style={{
              backgroundColor: 'var(--bg-primary)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-glass)',
              fontSize: '1.25rem',
              lineHeight: '1.6',
              fontWeight: '500',
              color: 'var(--text-primary)'
            }}>
              "{dailyMemory.ai_story || dailyMemory.description}"
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '0.5rem' }}>
              <button 
                onClick={() => readAloud(dailyMemory.ai_story || dailyMemory.description, 'daily')} 
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: '1rem', minHeight: '44px' }}
              >
                {speakingId === 'daily' ? <VolumeX size={18} /> : <Volume2 size={18} />}
                {speakingId === 'daily' ? 'Pause' : 'Listen Aloud'}
              </button>
              <button 
                onClick={() => setSelectedMemory(dailyMemory)} 
                className="btn btn-secondary"
                style={{ padding: '10px 24px', fontSize: '1rem', minHeight: '44px' }}
              >
                View Full Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Horizontal scroll filter */}
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '10px 20px',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: activeCategory === cat ? 'var(--accent-primary)' : 'var(--border-glass)',
              backgroundColor: activeCategory === cat ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: activeCategory === cat ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.95rem',
              transition: 'var(--transition)',
              whiteSpace: 'nowrap'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Memory Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          <span className="pulse-mic">⏳</span> Loading precious memories...
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          <Image size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Memories Found</h3>
          <p>Start preserving your family story by uploading your first memory or checking another filter!</p>
        </div>
      ) : (
        <div className="memory-grid" style={{ padding: 0 }}>
          {filteredMemories.map(mem => (
            <div key={mem.id} className="memory-card" onClick={() => setSelectedMemory(mem)} style={{ cursor: 'pointer' }}>
              {mem.media_url ? (
                mem.media_type === 'image' || mem.media_type === 'file' ? (
                  <img src={getFullMediaUrl(mem.media_url)} alt={mem.title} className="memory-image" />
                ) : mem.media_type === 'video' ? (
                  <video src={getFullMediaUrl(mem.media_url)} className="memory-image" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="memory-image" style={{ backgroundColor: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                    🎵
                  </div>
                )
              ) : (
                <div className="memory-image" style={{ backgroundColor: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                  📝
                </div>
              )}

              <div className="memory-content">
                <span className="memory-category">{mem.category}</span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '8px', lineHeight: '1.3' }}>{mem.title}</h3>
                {mem.event_date && (
                  <div className="memory-date" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} /> {mem.event_date}
                  </div>
                )}
                <p style={{
                  fontSize: '0.95rem',
                  color: 'var(--text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginTop: '8px',
                  lineHeight: '1.5'
                }}>
                  {mem.ai_story || mem.description}
                </p>
                
                {/* Micro control triggers inside cards */}
                <div style={{ marginTop: 'auto', paddingTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => readAloud(mem.ai_story || mem.description, mem.id)} 
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}
                  >
                    {speakingId === mem.id ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    {speakingId === mem.id ? 'Stop' : 'Listen'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accessible Full Screen Overlay (for elderly view) */}
      {selectedMemory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(18, 16, 14, 0.95)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }} onClick={() => { setSelectedMemory(null); window.speechSynthesis.cancel(); setSpeakingId(null); }}>
          
          <div className="glass-card" style={{
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2.5rem',
            backgroundColor: 'var(--bg-secondary)',
            display: 'grid',
            gridTemplateColumns: selectedMemory.media_url ? '1fr 1fr' : '1fr',
            gap: '2.5rem',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            
            <button 
              onClick={() => { setSelectedMemory(null); window.speechSynthesis.cancel(); setSpeakingId(null); }}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'var(--accent-soft)',
                border: 'none',
                color: 'var(--text-primary)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            {selectedMemory.media_url && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
                {selectedMemory.media_type === 'image' || selectedMemory.media_type === 'file' ? (
                  <img src={getFullMediaUrl(selectedMemory.media_url)} alt="" style={{ width: '100%', maxHeight: '450px', objectFit: 'contain' }} />
                ) : selectedMemory.media_type === 'video' ? (
                  <video src={getFullMediaUrl(selectedMemory.media_url)} controls style={{ width: '100%', maxHeight: '450px' }} />
                ) : (
                  <audio src={getFullMediaUrl(selectedMemory.media_url)} controls style={{ width: '90%' }} />
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
              <span className="memory-category" style={{ alignSelf: 'flex-start' }}>{selectedMemory.category}</span>
              <h2 style={{ fontSize: '2.5rem', fontWeight: '800' }}>{selectedMemory.title}</h2>
              {selectedMemory.event_date && (
                <div style={{ color: 'var(--text-muted)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={18} /> Date: {selectedMemory.event_date}
                </div>
              )}
              
              <div style={{
                backgroundColor: 'var(--bg-primary)',
                padding: '2rem',
                borderRadius: '16px',
                border: '2px solid var(--accent-primary)',
                fontSize: '1.4rem',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                fontWeight: '500'
              }}>
                "{selectedMemory.ai_story || selectedMemory.description}"
              </div>

              {selectedMemory.description && selectedMemory.ai_story && (
                <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
                  <strong>Original Family Notes:</strong>
                  <p style={{ marginTop: '4px', fontStyle: 'italic' }}>{selectedMemory.description}</p>
                </div>
              )}

              <button
                onClick={() => readAloud(selectedMemory.ai_story || selectedMemory.description, selectedMemory.id)}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem', fontSize: '1.15rem' }}
              >
                {speakingId === selectedMemory.id ? <VolumeX size={20} /> : <Volume2 size={20} />}
                {speakingId === selectedMemory.id ? 'Stop Speaking' : 'Read Memory Aloud'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
