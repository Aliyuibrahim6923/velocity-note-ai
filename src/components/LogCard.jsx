// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';

export function LogCard({ item, onDelete, onUpdate, onComplete }) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.raw_text || '');
  const [isCollapsed, setIsCollapsed] = useState(false);

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



  // Handle actions directly
  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleComplete = () => {
    onComplete(item.id);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      onDelete(item.id);
    }
  };

  return (
    <div className={cardClass} style={{ ...(isCompleted ? {opacity: 0.6} : {}), position: 'relative' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center' }}>
        <span className={badgeClass}>{badgeText}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span>{new Date(item.created_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
          
          <div style={{ display: 'flex', gap: '0.4rem', borderLeft: '1px solid var(--border)', paddingLeft: '0.6rem', marginLeft: '0.2rem' }}>
            {isAction && !isCompleted && !isEditing && (
              <button 
                onClick={handleComplete}
                title="Complete Action"
                style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '1rem', padding: '0', lineHeight: '1' }}
              >
                ✓
              </button>
            )}
            {!isEditing && (
              <button 
                onClick={handleEdit}
                title="Edit Log"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0', lineHeight: '1' }}
              >
                ✎
              </button>
            )}
            {!isEditing && (
              <button 
                onClick={handleDelete}
                title="Delete Log"
                style={{ background: 'none', border: 'none', color: 'var(--error, #ef4444)', cursor: 'pointer', fontSize: '1rem', padding: '0', lineHeight: '1' }}
              >
                ✕
              </button>
            )}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0', lineHeight: '1', display: 'flex', alignItems: 'center', marginLeft: '0.2rem' }}
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? '⌄' : '⌃'}
            </button>
          </div>
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
