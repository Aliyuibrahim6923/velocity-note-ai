// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';

export function LogCard({ item, onDelete, onUpdate, onComplete }) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.raw_text || '');

  const [showMenu, setShowMenu] = useState(false);

  const handleSave = () => {
    if (onUpdate) onUpdate(item.id, editText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(item.raw_text);
    setIsEditing(false);
  };

  const isAction = item.category === 'ACTION_ITEM';
  const isEvent = item.category === 'CALENDAR_EVENT';
  const isFinancial = item.category === 'FINANCIAL_LOG';
  
  let meta = {};
  try {
    meta = JSON.parse(item.metadata_json || '{}');
  } catch { /* ignore */ }

  const isCompleted = meta.completed === true;
  
  let cardClass = 'timeline-card ';
  let badgeClass = 'card-badge ';
  let badgeText = 'Intel';

  if (isAction) { cardClass += 'card-action'; badgeClass += 'badge-action'; badgeText = 'Action'; }
  else if (isEvent) { cardClass += 'card-event'; badgeClass += 'badge-event'; badgeText = 'Event'; }
  else if (isFinancial) { cardClass += 'card-financial'; badgeClass += 'badge-financial'; badgeText = 'Finance'; }
  else { cardClass += 'card-intel'; badgeClass += 'badge-intel'; }

  if (isCompleted) {
    cardClass += ' completed-card';
  }

  const CHAR_LIMIT = 150;
  const shouldTruncate = item.raw_text && item.raw_text.length > CHAR_LIMIT;
  const displayText = expanded ? item.raw_text : (item.raw_text ? item.raw_text.slice(0, CHAR_LIMIT) : '') + (shouldTruncate ? '...' : '');

  const [isCollapsed, setIsCollapsed] = useState(false);

  const executeAction = (actionFn) => {
    actionFn();
    setShowMenu(false);
  };

  return (
    <div className={cardClass} style={{ ...(isCompleted ? {opacity: 0.6} : {}), position: 'relative' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center' }}>
        <span className={badgeClass}>{badgeText}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
          <span>{new Date(item.created_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', lineHeight: '1', display: 'flex', alignItems: 'center' }}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? '⌄' : '⌃'}
          </button>

          {!isEditing && (
            <button 
              onClick={() => setShowMenu(!showMenu)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', lineHeight: '1' }}
            >
              ⋮
            </button>
          )}
          
          {showMenu && !isEditing && (
            <div style={{
              position: 'absolute', top: '100%', right: '0', background: 'var(--bg-card)', 
              border: '1px solid var(--border)', borderRadius: '8px', padding: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '120px',
              display: 'flex', flexDirection: 'column'
            }}>
              {isAction && !isCompleted && (
                <button 
                  onClick={() => executeAction(() => onComplete(item.id))} 
                  style={{background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', padding: '8px', textAlign: 'left', borderRadius: '4px'}}
                  onMouseOver={(e) => e.target.style.background = 'rgba(16, 185, 129, 0.1)'}
                  onMouseOut={(e) => e.target.style.background = 'none'}
                >
                  ✓ Complete
                </button>
              )}
              <button 
                onClick={() => executeAction(() => setIsEditing(true))} 
                style={{background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', padding: '8px', textAlign: 'left', borderRadius: '4px'}}
                onMouseOver={(e) => e.target.style.background = 'var(--panel-bg)'}
                onMouseOut={(e) => e.target.style.background = 'none'}
              >
                ✎ Edit
              </button>
              <button 
                onClick={() => executeAction(() => onDelete(item.id))} 
                style={{background: 'none', border: 'none', color: 'var(--error, #ef4444)', cursor: 'pointer', fontSize: '0.85rem', padding: '8px', textAlign: 'left', borderRadius: '4px'}}
                onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                onMouseOut={(e) => e.target.style.background = 'none'}
              >
                🗑 Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      {!isCollapsed && (
        <>
          <div className="card-body" style={isCompleted ? {textDecoration: 'line-through'} : {}}>
            {isEditing ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'inherit' }}
              />
            ) : (
              <>
                {displayText}
                {shouldTruncate && (
                  <button 
                    style={{display: 'inline', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', marginLeft: '0.5rem', fontWeight: 'bold'}}
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? 'Show Less' : 'Show More'}
                  </button>
                )}
              </>
            )}
          </div>
          
          {Object.keys(meta).length > 0 && !isEditing && (
            <div className="card-meta">
              {Object.entries(meta).map(([k, v]) => (
                k !== 'completed' && <span key={k} className="meta-pill">{k}: {v}</span>
              ))}
            </div>
          )}
          
          {isEditing && (
            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', gap: '0.5rem'}}>
              <button onClick={handleCancel} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem'}}>Cancel</button>
              <button onClick={handleSave} style={{background: 'var(--accent-primary)', border: 'none', color: 'white', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'}}>Save</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
