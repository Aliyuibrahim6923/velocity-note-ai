// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';

export function LogCard({ item, onDelete }) {
  const [expanded, setExpanded] = useState(false);

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
  const shouldTruncate = item.raw_text.length > CHAR_LIMIT;
  const displayText = expanded ? item.raw_text : item.raw_text.slice(0, CHAR_LIMIT) + (shouldTruncate ? '...' : '');

  return (
    <div className={cardClass}>
      <div className="card-header">
        <span className={badgeClass}>{badgeText}</span>
        <span>{new Date(item.created_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
      </div>
      <div className="card-body">
        {displayText}
        {shouldTruncate && (
          <button 
            style={{display: 'inline', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', marginLeft: '0.5rem', fontWeight: 'bold'}}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
      
      {Object.keys(meta).length > 0 && (
        <div className="card-meta">
          {Object.entries(meta).map(([k, v]) => (
            <span key={k} className="meta-pill">{k}: {v}</span>
          ))}
        </div>
      )}
      
      <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem'}}>
        <button 
          onClick={() => onDelete(item.id)}
          style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem'}}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
