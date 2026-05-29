import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Heart } from 'lucide-react';
import { API_URL } from '../config';

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(false);

  let recognition = null;

  // Initialize Speech Recognition
  if (typeof window !== 'undefined') {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
    }
  }

  useEffect(() => {
    if (!recognition) {
      setSupported(false);
    }
    return () => {
      if (speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startListening = () => {
    if (!recognition) return;
    
    // Cancel any current speaking
    window.speechSynthesis.cancel();
    setSpeaking(false);
    
    setTranscript('Listening closely...');
    setAiResponse('');
    setIsListening(true);

    recognition.start();

    recognition.onresult = async (event) => {
      const speechToText = event.results[0][0].transcript;
      setTranscript(speechToText);
      setIsListening(false);
      await sendVoiceQuery(speechToText);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setTranscript('I did not catch that. Please press the button and try speaking again.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const sendVoiceQuery = async (queryText) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/voice/query?q=${encodeURIComponent(queryText)}`);
      const response = res.data.response;
      setAiResponse(response);
      speakResponse(response);
    } catch (err) {
      console.error('Voice query error:', err);
      const errText = "I had trouble connecting to your memories. Let's try again in a moment.";
      setAiResponse(errText);
      speakResponse(errText);
    } finally {
      setLoading(false);
    }
  };

  const speakResponse = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // stop any other speaking
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // speak slightly slower for elderly clarity
    utterance.pitch = 1.05; // warmer pitch

    // Select a pleasant female voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(voice => 
      voice.name.includes('Natural') || voice.name.includes('Google') || voice.name.includes('Zira')
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  };

  if (!supported) {
    return (
      <div style={{ maxWidth: '640px', margin: '3rem auto', padding: '1rem' }} className="glass-card">
        <h2 style={{ fontSize: '1.8rem', color: 'var(--danger)', marginBottom: '1rem' }}>Voice Assistant Unavailable</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Your browser does not support Speech Recognition. Please try using Google Chrome, Microsoft Edge, or Apple Safari for full voice features.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '640px',
      margin: '3rem auto',
      padding: '2rem',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem'
    }} className="glass-card">
      <div>
        <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Heart size={28} color="var(--accent-primary)" fill="var(--accent-primary)" /> Ask the Vault
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem' }}>
          Press the microphone, speak naturally, and ask questions about your family and life.
        </p>
      </div>

      {/* Pulsing Mic Circle Button */}
      <button
        onClick={isListening ? () => {} : startListening}
        style={{
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isListening ? '#EF4444' : 'var(--accent-primary)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isListening ? '0 0 30px rgba(239, 68, 68, 0.6)' : 'var(--shadow-lg)',
          transition: 'var(--transition)',
          position: 'relative'
        }}
        className={isListening ? 'pulse-mic' : ''}
      >
        {isListening ? <MicOff size={56} /> : <Mic size={56} />}
      </button>

      <span style={{ fontSize: '1.2rem', fontWeight: '600', color: isListening ? '#EF4444' : 'var(--text-primary)' }}>
        {isListening ? 'Listening... Speak now' : 'Tap to start talking'}
      </span>

      {/* User voice transcript box */}
      {transcript && (
        <div style={{
          width: '100%',
          padding: '1.25rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border-glass)',
          fontSize: '1.15rem',
          color: 'var(--text-primary)',
          fontWeight: '500',
          fontStyle: 'italic'
        }}>
          "{transcript}"
        </div>
      )}

      {/* AI Memory reply box */}
      {(loading || aiResponse) && (
        <div style={{
          width: '100%',
          padding: '2rem',
          backgroundColor: 'var(--bg-glass)',
          borderRadius: '16px',
          border: '2px solid var(--accent-primary)',
          textAlign: 'left',
          position: 'relative',
          boxShadow: 'var(--shadow-md)'
        }}>
          <span style={{
            position: 'absolute',
            top: '-12px',
            left: '20px',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            padding: '2px 12px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Sparkles size={12} /> Vault Voice
          </span>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              <span className="pulse-mic">✨</span> Searching family memories...
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '1.3rem', lineHeight: '1.6', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                {aiResponse}
              </p>
              
              {speaking ? (
                <button
                  onClick={stopSpeaking}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.85rem',
                    minHeight: 'auto',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <VolumeX size={16} /> Stop Speaking
                </button>
              ) : (
                <button
                  onClick={() => speakResponse(aiResponse)}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.85rem',
                    minHeight: 'auto',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Volume2 size={16} /> Read Aloud
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Guide text */}
      <div style={{
        backgroundColor: 'var(--accent-soft)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '0.95rem',
        color: 'var(--accent-primary)',
        width: '100%',
        textAlign: 'left'
      }}>
        💡 <strong>Try asking:</strong>
        <ul style={{ marginLeft: '20px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>"Who is my grandson?"</li>
          <li>"Show my wedding memories"</li>
          <li>"Tell me about my college days"</li>
        </ul>
      </div>
    </div>
  );
}
