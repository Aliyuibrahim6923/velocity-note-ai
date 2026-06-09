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
  const [googleToken, setGoogleToken] = useState(localStorage.getItem('googleToken'));
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedTag, setSelectedTag] = useState('');
  const [interimText, setInterimText] = useState('');
  
  // Phase 3 States
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  const [activeView, setActiveView] = useState('TIMELINE');
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
        filterMonth,
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
  }, [activeFilter, searchTerm, sortOrder, filterMonth]);

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
  }, [hasMore, offset, activeFilter, searchTerm, sortOrder, filterMonth]);

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

        if (newItem.category === 'CALENDAR_EVENT' && googleToken) {
          try {
            const handsUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
              ? '' : 'http://127.0.0.1:8002';
            
            await fetch(`${handsUrl}/api/hands/schedule`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                title: newItem.raw_text,
                description: "Created by Velocity Note AI",
                start_time: startTime,
                end_time: endTime,
                google_token: googleToken || null
              })
            });
          } catch (err) {
            console.error("Failed to sync to Hands", err);
          }
        }
      }
    } catch (e) {
      console.error("Failed to process input", e);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const text = params.get('text');
    const url = params.get('url');
    const title = params.get('title');

    let combined = '';
    if (title) combined += title + ' ';
    if (text) combined += text + ' ';
    if (url) combined += url;
    
    if (combined.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      processInput(`[SHARED VIA DEVICE]: ${combined.trim()}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentInput = (inputText + ' ' + interimText).trim();
    const currentImage = selectedImage;

    if (!currentInput && !currentImage) return;

    // Clear UI instantly for zero-friction feel
    setInputText('');
    setInterimText('');
    setSelectedImage(null);
    const tagToApply = selectedTag;
    setSelectedTag('');
    if (isRecording && speechRef.current) {
      speechRef.current.stop();
      setIsRecording(false);
    }

    if (currentImage) {
      const formData = new FormData();
      formData.append('file', currentImage);
      try {
        const brainUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
          ? '' : 'http://127.0.0.1:8001';
          
        const res = await fetch(`${brainUrl}/api/documents/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.status === 'success') {
          let baseText = currentInput;
          if (tagToApply) baseText = `${baseText} [TAG: ${tagToApply}]`.trim();
          
          const finalPayload = baseText 
            ? `${baseText}\n[SCANNED DOC]: ${data.extracted_text}`
            : `[SCANNED DOC]: ${data.extracted_text}`;
          await processInput(finalPayload);
        } else {
          console.error("OCR failed:", data);
          // Fallback: If OCR fails but they typed something, still process their text
          if (currentInput) {
            await processInput(`${currentInput}\n[Image Upload Failed: ${data.detail || 'Could not read image'}]`);
          } else {
            alert(`OCR Failed: ${data.detail || 'Could not extract text from image'}`);
          }
        }
      } catch (err) {
        console.error("Upload failed", err);
        if (currentInput) await processInput(currentInput);
        else alert("Image upload failed due to a network error.");
      }
    } else {
      await processInput(currentInput);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedImage(file);
    // Reset the input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      
      // Re-run AI triage to get updated category and metadata
      const triagedItem = await triageInput(newText);
      
      const updatedItem = { 
        ...triagedItem,
        id: itemToUpdate.id, // Preserve original ID
        created_at: itemToUpdate.created_at // Preserve original creation time
      };
      
      await dbService.saveItem(updatedItem);
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (e) {
      console.error("Failed to update", e);
    }
  };

  const handleComplete = async (id) => {
    try {
      const itemToUpdate = items.find(i => i.id === id);
      if (!itemToUpdate) return;
      
      let meta = {};
      try { meta = JSON.parse(itemToUpdate.metadata_json || '{}'); } catch { /* ignore */ }
      
      meta.completed = true;
      const updatedItem = { ...itemToUpdate, metadata_json: JSON.stringify(meta) };
      
      await dbService.saveItem(updatedItem);
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (e) {
      console.error("Failed to complete", e);
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
            <select className="sort-select" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{marginLeft: '0.5rem'}}>
              <option value="ALL">All Months</option>
              <option value="0">January</option>
              <option value="1">February</option>
              <option value="2">March</option>
              <option value="3">April</option>
              <option value="4">May</option>
              <option value="5">June</option>
              <option value="6">July</option>
              <option value="7">August</option>
              <option value="8">September</option>
              <option value="9">October</option>
              <option value="10">November</option>
              <option value="11">December</option>
            </select>
            
            <button className={`filter-btn ${activeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setActiveFilter('ALL')} style={{marginLeft: '1rem'}}>All</button>
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
            <LogCard key={item.id} item={item} onDelete={handleDelete} onUpdate={handleUpdate} onComplete={handleComplete} />
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
          {selectedImage && (
            <div className="image-preview-container" style={{padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box'}}>
              <div style={{position: 'relative', display: 'inline-block', alignSelf: 'flex-start'}}>
                <img src={URL.createObjectURL(selectedImage)} alt="preview" style={{height: '60px', borderRadius: '8px', border: '1px solid var(--border)'}} />
                <button 
                  onClick={() => setSelectedImage(null)} 
                  style={{position: 'absolute', top: '-8px', right: '-8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%', cursor: 'pointer', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-primary)'}}>✕</button>
              </div>
              <div className="tag-selector" style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
                {['incoming', 'business incomes', 'other incomes', 'general expenses', 'loan given to others', 'loan repayment by others', 'paid debt to others'].map(tag => (
                  <button 
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
                    style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', border: '1px solid var(--border)', cursor: 'pointer',
                      background: selectedTag === tag ? 'var(--text-primary)' : 'var(--bg-card)',
                      color: selectedTag === tag ? 'var(--bg-card)' : 'var(--text-primary)'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
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
              placeholder={isRecording ? "Listening..." : "Capture thought or describe image..."}
              value={isRecording ? (inputText + " " + interimText).trim() : inputText}
              onChange={(e) => {
                if(!isRecording) setInputText(e.target.value);
              }}
            />
            <button type="submit" className="send-button" style={{display: inputText.trim() || interimText.trim() || selectedImage ? 'flex' : 'none'}}>
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
