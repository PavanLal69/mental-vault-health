import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Camera, Music, Sparkles, UserPlus, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../config';

export default function UploadMemory({ token, onUploadSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Family');
  const [mediaType, setMediaType] = useState('image');
  const [eventDate, setEventDate] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const categories = ['Childhood', 'Education', 'Career', 'Marriage', 'Family', 'Travel', 'Holiday', 'Other'];

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/family-members`);
      setFamilyMembers(res.data);
    } catch (err) {
      console.error('Error fetching family members:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    // Create preview url
    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setMediaType('image');
    } else if (selectedFile.type.startsWith('audio/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setMediaType('audio');
    } else if (selectedFile.type.startsWith('video/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setMediaType('video');
    } else {
      setMediaType('text');
    }
  };

  const handleMemberToggle = (memberId) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for this memory.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('media_type', mediaType);
    formData.append('event_date', eventDate);
    if (file) {
      formData.append('file', file);
    }
    formData.append('linked_members', selectedMembers.join(','));

    try {
      await axios.post(`${API_URL}/api/memories`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      setSuccess(true);
      setTitle('');
      setDescription('');
      setCategory('Family');
      setMediaType('image');
      setEventDate('');
      setFile(null);
      setPreviewUrl(null);
      setSelectedMembers([]);

      setTimeout(() => {
        setSuccess(false);
        if (onUploadSuccess) onUploadSuccess();
      }, 2000);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to upload memory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '2rem auto', padding: '0 1rem' }}>
      <div className="glass-card">
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Upload color="var(--accent-primary)" size={28} /> Save a New Memory
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Add photos, stories, or voice notes. Our AI will automatically simplify them into readable memories.
        </p>

        {success && (
          <div style={{
            backgroundColor: 'rgba(21, 128, 61, 0.1)',
            borderLeft: '4px solid var(--success)',
            color: 'var(--success)',
            padding: '16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '1.5rem'
          }}>
            <CheckCircle2 size={24} />
            <div>
              <strong>Memory Saved!</strong> Our AI helper is writing the story card right now.
            </div>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: 'rgba(185, 28, 28, 0.1)',
            borderLeft: '4px solid var(--danger)',
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Memory Title</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Wedding Day in Seattle, Helen's Graduation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Category</label>
              <select
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
              Describe the Memory (What happened? Who was there?)
            </label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Write down any notes or details. If uploading a voice note, copy the transcription here or leave details. Our AI will clean it up."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Approximate Date</label>
              <input
                type="date"
                className="input-field"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Memory Media</label>
              <input
                type="file"
                id="file-upload"
                style={{ display: 'none' }}
                accept="image/*,audio/*,video/*"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-upload"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '12px',
                  border: '2px dashed var(--border-glass)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-secondary)',
                  textAlign: 'center',
                  height: '52px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)'
                }}
              >
                {file ? `Selected: ${file.name.substring(0, 15)}...` : 'Upload Photo/Audio/Video'}
              </label>
            </div>
          </div>

          {previewUrl && (
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '12px',
              border: '1px solid var(--border-glass)',
              textAlign: 'center'
            }}>
              {mediaType === 'image' && (
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }}
                />
              )}
              {mediaType === 'audio' && (
                <audio src={previewUrl} controls style={{ width: '100%' }} />
              )}
              {mediaType === 'video' && (
                <video src={previewUrl} controls style={{ maxHeight: '200px', maxWidth: '100%' }} />
              )}
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Link Family Members in this Memory:
            </label>
            {familyMembers.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No family members created yet. Set up the Family Tree to link them here!
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {familyMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleMemberToggle(member.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '9999px',
                      border: '1px solid',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      transition: 'var(--transition)',
                      backgroundColor: selectedMembers.includes(member.id) ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: selectedMembers.includes(member.id) ? '#fff' : 'var(--text-primary)',
                      borderColor: selectedMembers.includes(member.id) ? 'var(--accent-primary)' : 'var(--border-glass)'
                    }}
                  >
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt=""
                        style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ display: 'block', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--accent-soft)', textAlign: 'center', fontSize: '0.7rem', lineHeight: '20px' }}>
                        👤
                      </span>
                    )}
                    {member.name} ({member.relation})
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '1rem', width: '100%' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Sparkles size={20} className="pulse-mic" /> Analyzing & Generating AI Story...
              </>
            ) : (
              <>
                <FileText size={20} /> Save to Vault
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
