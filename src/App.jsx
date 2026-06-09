// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from './services/db';
import { triageInput } from './services/ai';
import { createSpeechRecognition } from './services/speech';
import { initializeAlarms } from './services/alarms';
import { syncItemToDrive } from './services/google';
import { Settings } from './components/Settings';
import { LogCard } from './components/LogCard';
import { FinancialDashboard } from './components/FinancialDashboard';
import './App.css';

function App() {
  const [items, setItems] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  
  // Phase 3 States
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  const [activeView, setActiveView] = useState('TIMELINE');
  const [googleToken, setGoogleToken] = useState(null);
  const speechRef = useRef(null);
  const feedEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch items with pagination and filters
  const loadItems = async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset;
      const data = await dbService.queryItems({
        searchTerm,
        category: activeFilter,
        sortOrder,
        limit: LIMIT,
        offset: currentOffset
      });
      
      if (reset) {
        setItems(data);
      } else {
        setItems(prev => [...prev, ...data]);
      }
      
      setOffset(currentOffset + data.length);
      setHasMore(data.length === LIMIT);
    } catch (e) {
      console.error("Failed to load items", e);
    }
  };

  // Re-run search/filter completely on change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadItems(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, searchTerm, sortOrder]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadItems(false);
      }
    }, { threshold: 1.0 });

    if (feedEndRef.current) {
      observer.observe(feedEndRef.current);
    }

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, offset, activeFilter, searchTerm, sortOrder]);

  useEffect(() => {
    initializeAlarms();
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

      if (newItem.category === 'CALENDAR_EVENT' || newItem.category === 'ACTION_ITEM') {
        let meta = {};
        try { meta = JSON.parse(newItem.metadata_json); } catch (e) { console.error("Parse error", e); }
        
        const startTime = meta.due_date || new Date(Date.now() + 3600000).toISOString();
        const endTime = meta.end_time || new Date(new Date(startTime).getTime() + 3600000).toISOString();

        fetch('/api/hands/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newItem.raw_text,
            description: "Created by Velocity Note AI",
            start_time: startTime,
            end_time: endTime,
            google_token: googleToken || null
          })
        }).catch(err => console.error("Failed to sync to Hands", err));
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

  const handleUpdate = async (id, newText) => {
    try {
      const itemToUpdate = items.find(i => i.id === id);
      if (!itemToUpdate) return;
      const updatedItem = { ...itemToUpdate, raw_text: newText };
      await dbService.saveItem(updatedItem);
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (e) {
      console.error("Failed to update", e);
    }
  };



  return (
    <div className="os-container">
      <header className="app-header">
        <div className="header-title" onClick={() => setActiveView('TIMELINE')} style={{cursor: 'pointer'}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Blitz
        </div>
        <div className="top-nav">
          <button className={`nav-tab ${activeView === 'TIMELINE' ? 'active' : ''}`} onClick={() => setActiveView('TIMELINE')}>Timeline</button>
          <button className={`nav-tab ${activeView === 'FINANCE' ? 'active' : ''}`} onClick={() => setActiveView('FINANCE')}>Finance</button>
          <button className={`nav-tab ${activeView === 'SETTINGS' ? 'active' : ''}`} onClick={() => setActiveView('SETTINGS')}>Settings</button>
        </div>
      </header>

      {activeView === 'TIMELINE' && (
        <>
          <div className="filter-bar">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select className="sort-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
            
            <button className={`filter-btn ${activeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setActiveFilter('ALL')}>All</button>
            <button className={`filter-btn ${activeFilter === 'ACTION_ITEM' ? 'active' : ''}`} onClick={() => setActiveFilter('ACTION_ITEM')}>Tasks</button>
            <button className={`filter-btn ${activeFilter === 'CALENDAR_EVENT' ? 'active' : ''}`} onClick={() => setActiveFilter('CALENDAR_EVENT')}>Events</button>
            <button className={`filter-btn ${activeFilter === 'FINANCIAL_LOG' ? 'active' : ''}`} onClick={() => setActiveFilter('FINANCIAL_LOG')}>Finance</button>
            <button className={`filter-btn ${activeFilter === 'STATIC_INTEL' ? 'active' : ''}`} onClick={() => setActiveFilter('STATIC_INTEL')}>Intel</button>
          </div>

          <main className="feed-container">
        {items.length === 0 && !hasMore ? (
          <div className="empty-state">
            <div className="empty-icon">⚡️</div>
            <p>Your mind, structured instantly.<br/>Tap the mic or type to capture a thought.</p>
          </div>
        ) : (
          items.map((item) => (
            <LogCard key={item.id} item={item} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))
        )}
        {hasMore && <div className="loading-indicator">Loading...</div>}
        <div ref={feedEndRef} style={{ height: '120px' }} />
      </main>
        </>
      )}

      {activeView === 'FINANCE' && <FinancialDashboard />}
      {activeView === 'SETTINGS' && <Settings onGoogleToken={setGoogleToken} googleToken={googleToken} />}

      {activeView === 'TIMELINE' && (
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
            <button type="submit" className="send-button" style={{display: inputText.trim() || interimText.trim() ? 'flex' : 'none'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
