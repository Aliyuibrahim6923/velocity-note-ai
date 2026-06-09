// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from './services/db';
import { triageInput } from './services/ai';
import { createSpeechRecognition } from './services/speech';
import { initializeAlarms } from './services/alarms';
import { syncItemToDrive } from './services/google';
import { Settings } from './components/Settings';
import './App.css';

function App() {
  const [items, setItems] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [googleToken, setGoogleToken] = useState(null);
  const speechRef = useRef(null);
  const feedEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize DB and fetch items
  useEffect(() => {
    const loadItems = async () => {
      try {
        const data = await dbService.getAllItems();
        setItems(data);
      } catch (e) {
        console.error("Failed to load items", e);
      }
    };
    initializeAlarms();
    loadItems();
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const recognizer = createSpeechRecognition(
      (final, interim) => {
        setInterimText(interim);
        if (final) {
          setInputText(prev => (prev + ' ' + final).trim());
        }
      },
      () => {
        setIsRecording(false);
      },
      (finalText) => {
        setIsRecording(false);
        setInterimText('');
        if (finalText) {
           // We could auto-submit here, but for control we just append
           setInputText(prev => (prev + ' ' + finalText).trim());
        }
      }
    );
    speechRef.current = recognizer;
    
    return () => {
      if (speechRef.current) speechRef.current.stop();
    };
  }, []);

  const handleMicToggle = () => {
    if (!speechRef.current) return;
    
    if (isRecording) {
      speechRef.current.stop();
      setIsRecording(false);
      setInterimText('');
    } else {
      speechRef.current.start();
      setIsRecording(true);
    }
  };

  const processInput = async (finalPayload) => {
    if (!finalPayload) return;
    try {
      const newItem = await triageInput(finalPayload);
      await dbService.saveItem(newItem);
      setItems(prev => [newItem, ...prev]);

      if (googleToken && (newItem.category === 'FINANCIAL_LOG' || newItem.category === 'STATIC_INTEL')) {
        syncItemToDrive(newItem, googleToken);
      }
    } catch (e) {
      console.error("Failed to process input", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalPayload = (inputText + ' ' + interimText).trim();
    if (!finalPayload) return;

    // Clear UI instantly for zero-friction feel
    setInputText('');
    setInterimText('');
    if (isRecording && speechRef.current) {
      speechRef.current.stop();
      setIsRecording(false);
    }

    await processInput(finalPayload);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Send to Python Brain Service for OCR and Neo4j Graphing
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        // 2. Feed the extracted OCR text into the local AI triage engine
        processInput(`[SCANNED DOC]: ${data.extracted_text}`);
      }
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await dbService.deleteItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      console.error("Failed to delete", e);
    }
  };

  const renderCard = (item) => {
    const isAction = item.category === 'ACTION_ITEM';
    const isEvent = item.category === 'CALENDAR_EVENT';
    const isFinancial = item.category === 'FINANCIAL_LOG';
    // isIntel is the default if others are false
    
    let cardClass = 'timeline-card ';
    let badgeClass = 'card-badge ';
    let badgeText;

    if (isAction) { cardClass += 'card-action'; badgeClass += 'badge-action'; badgeText = 'Action'; }
    else if (isEvent) { cardClass += 'card-event'; badgeClass += 'badge-event'; badgeText = 'Event'; }
    else if (isFinancial) { cardClass += 'card-financial'; badgeClass += 'badge-financial'; badgeText = 'Finance'; }
    else { cardClass += 'card-intel'; badgeClass += 'badge-intel'; badgeText = 'Intel'; }

    let meta = {};
    try {
      meta = JSON.parse(item.metadata_json || '{}');
    } catch { /* ignore */ }

    return (
      <div key={item.id} className={cardClass}>
        <div className="card-header">
          <span className={badgeClass}>{badgeText}</span>
          <span>{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div className="card-body">
          {item.raw_text}
        </div>
        
        {Object.keys(meta).length > 0 && (
          <div className="card-meta">
            {Object.entries(meta).map(([k, v]) => (
              <span key={k} className="meta-pill">{k}: {v}</span>
            ))}
          </div>
        )}
        
        {/* Simplified Interaction buttons for MVP */}
        <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem'}}>
          <button 
            onClick={() => handleDelete(item.id)}
            style={{background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem'}}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="os-container">
      <header className="app-header">
        <div className="header-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Blitz
        </div>
        <button className="settings-btn" onClick={() => setIsSettingsOpen(true)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </header>

      <div className="filter-bar">
        <button className={`filter-btn ${activeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setActiveFilter('ALL')}>All</button>
        <button className={`filter-btn ${activeFilter === 'ACTION_ITEM' ? 'active' : ''}`} onClick={() => setActiveFilter('ACTION_ITEM')}>Tasks</button>
        <button className={`filter-btn ${activeFilter === 'CALENDAR_EVENT' ? 'active' : ''}`} onClick={() => setActiveFilter('CALENDAR_EVENT')}>Events</button>
        <button className={`filter-btn ${activeFilter === 'FINANCIAL_LOG' ? 'active' : ''}`} onClick={() => setActiveFilter('FINANCIAL_LOG')}>Finance</button>
        <button className={`filter-btn ${activeFilter === 'STATIC_INTEL' ? 'active' : ''}`} onClick={() => setActiveFilter('STATIC_INTEL')}>Intel</button>
      </div>

      <main className="feed-container">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⚡️</div>
            <p>Your mind, structured instantly.<br/>Tap the mic or type to capture a thought.</p>
          </div>
        ) : (
          items.filter(item => activeFilter === 'ALL' || item.category === activeFilter).map(renderCard)
        )}
        <div ref={feedEndRef} />
      </main>

      <div className="capture-stream">
        <form onSubmit={handleSubmit} className="input-row">
          <button 
            type="button" 
            className={`icon-btn mic-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleMicToggle}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
          <button 
            type="button" 
            className="icon-btn cam-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Scan Document (OCR)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
          <input
            type="text"
            className="capture-input"
            placeholder={isRecording ? "Listening..." : "Capture thought..."}
            value={isRecording ? (inputText + " " + interimText).trim() : inputText}
            onChange={(e) => {
              if(!isRecording) setInputText(e.target.value);
            }}
          />
          <button type="submit" className="send-button" style={{display: inputText.trim() || interimText.trim() ? 'block' : 'none'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>
      {/* Settings Modal */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onGoogleToken={setGoogleToken} />
    </div>
  );
}

export default App;
