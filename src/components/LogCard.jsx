// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';

export function LogCard({ item, onDelete, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.raw_text || '');

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
  
  let cardClass = 'timeline-card ';
  let badgeClass = 'card-badge ';
  let badgeText = 'Intel';

  if (isAction) { cardClass += 'card-action'; badgeClass += 'badge-action'; badgeText = 'Action'; }
  else if (isEvent) { cardClass += 'card-event'; badgeClass += 'badge-event'; badgeText = 'Event'; }
  else if (isFinancial) { cardClass += 'card-financial'; badgeClass += 'badge-financial'; badgeText = 'Finance'; }
  else { cardClass += 'card-intel'; badgeClass += 'badge-intel'; }

  let meta = {};
  try {
    meta = JSON.parse(item.metadata_json || '{}');
  } catch { /* ignore */ }

  const CHAR_LIMIT = 150;
  const shouldTruncate = item.raw_text && item.raw_text.length > CHAR_LIMIT;
  const displayText = expanded ? item.raw_text : (item.raw_text ? item.raw_text.slice(0, CHAR_LIMIT) : '') + (shouldTruncate ? '...' : '');

  return (
    <div className={cardClass}>
      <div className="card-header">
        <span className={badgeClass}>{badgeText}</span>
        <span>{new Date(item.created_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
      </div>
      <div className="card-body">
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
            <span key={k} className="meta-pill">{k}: {v}</span>
          ))}
        </div>
      )}
      
      <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', gap: '0.5rem'}}>
        {isEditing ? (
          <>
            <button onClick={handleCancel} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem'}}>Cancel</button>
            <button onClick={handleSave} style={{background: 'var(--accent-primary)', border: 'none', color: 'white', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'}}>Save</button>
          </>
        ) : (
          <>
            <button onClick={() => setIsEditing(true)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem'}}>Edit</button>
            <button onClick={() => onDelete(item.id)} style={{background: 'none', border: 'none', color: 'var(--error, #ef4444)', cursor: 'pointer', fontSize: '0.8rem'}}>Delete</button>
          </>
        )}
      </div>
    </div>
  );
}
