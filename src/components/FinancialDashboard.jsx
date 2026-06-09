import { useState, useEffect } from 'react';
import { dbService } from '../services/db';

export function FinancialDashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0, loansOwedByMe: 0, loansOwedToMe: 0 });

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        const data = await dbService.queryItems({ category: 'FINANCIAL_LOG' });
        setLogs(data);

        let income = 0;
        let expense = 0;
        let loansOwedByMe = 0;
        let loansOwedToMe = 0;

        data.forEach(item => {
          try {
            const meta = JSON.parse(item.metadata_json);
            const amount = parseFloat(meta.amount || 0);
            
            if (meta.type === 'loan_lent') {
              loansOwedToMe += Math.abs(amount);
            } else if (meta.type === 'loan_borrowed') {
              loansOwedByMe += Math.abs(amount);
            } else if (meta.type === 'debt_paid') {
              loansOwedByMe -= Math.abs(amount);
              expense += Math.abs(amount); // It's still money leaving your pocket
            } else if (meta.type === 'loan_repayment_received') {
              loansOwedToMe -= Math.abs(amount);
              income += Math.abs(amount); // Money entering your pocket
            } else if (meta.type === 'income' || meta.type === 'income_business' || meta.type === 'income_other' || (amount > 0 && !meta.type)) {
              income += Math.abs(amount);
            } else {
              expense += Math.abs(amount);
            }
          } catch (e) {
            console.error("Parse error", e);
          }
        });

        setStats({ income, expense, balance: income - expense, loansOwedByMe, loansOwedToMe });
      } catch (err) {
        console.error("Failed to load finances", err);
      }
    };
    fetchFinances();
  }, []);

  const handleDelete = async (id) => {
    try {
      await dbService.deleteItem(id);
      setLogs(prev => prev.filter(log => log.id !== id));
      
      const data = await dbService.queryItems({ category: 'FINANCIAL_LOG' });
      setLogs(data);
      let income = 0, expense = 0, loansOwedByMe = 0, loansOwedToMe = 0;
      data.forEach(item => {
        try {
          const meta = JSON.parse(item.metadata_json);
          const amount = parseFloat(meta.amount || 0);
          
          if (meta.type === 'loan_lent') loansOwedToMe += Math.abs(amount);
          else if (meta.type === 'loan_borrowed') loansOwedByMe += Math.abs(amount);
          else if (meta.type === 'debt_paid') { loansOwedByMe -= Math.abs(amount); expense += Math.abs(amount); }
          else if (meta.type === 'loan_repayment_received') { loansOwedToMe -= Math.abs(amount); income += Math.abs(amount); }
          else if (meta.type === 'income' || meta.type === 'income_business' || meta.type === 'income_other' || (amount > 0 && !meta.type)) income += Math.abs(amount);
          else expense += Math.abs(amount);
        } catch (err) { console.warn("Failed to parse metadata", err); }
      });
      setStats({ income, expense, balance: income - expense, loansOwedByMe, loansOwedToMe });
    } catch (e) {
      console.error("Failed to delete", e);
    }
  };

  return (
    <div className="view-container fade-in">
      <header className="view-header">
        <h2>Financial Overview</h2>
        <p className="subtitle">Real-time ledger and wealth analytics.</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Balance</div>
          <div className={`stat-value ${stats.balance >= 0 ? 'positive' : 'negative'}`}>
            ${stats.balance.toFixed(2)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Income</div>
          <div className="stat-value positive">+${stats.income.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Expenses</div>
          <div className="stat-value negative">-${stats.expense.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Debt Money Coming In</div>
          <div className="stat-value" style={{color: '#3b82f6'}}>${stats.loansOwedToMe.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">My Debt</div>
          <div className="stat-value" style={{color: '#f59e0b'}}>${stats.loansOwedByMe.toFixed(2)}</div>
        </div>
      </div>

      <div className="transactions-list">
        <h3>Recent Activity</h3>
        {logs.length === 0 ? (
          <div className="empty-state">
            <p>No financial records found. Connect your wallet or email to sync.</p>
          </div>
        ) : (
          logs.map(log => {
            let meta = {};
            try { meta = JSON.parse(log.metadata_json); } catch (e) { console.warn("JSON parse failed", e); }
            const amount = parseFloat(meta.amount || 0);
            let isIncome = meta.type === 'income' || (amount > 0 && !meta.type);
            let sign = isIncome ? '+' : '-';
            let colorClass = isIncome ? 'positive' : 'negative';
            
            if (meta.type === 'loan_lent') { sign = ''; colorClass = ''; }
            if (meta.type === 'loan_borrowed') { sign = ''; colorClass = ''; }
            
            return (
              <div key={log.id} className="transaction-row">
                <div className="tx-details">
                  <div className="tx-merchant">{meta.payee || meta.merchant || 'Unknown Transaction'}</div>
                  <div className="tx-date">
                    {new Date(log.created_at).toLocaleDateString()} 
                    {meta.type && <span style={{marginLeft: '8px', opacity: 0.7, fontSize: '0.75rem', textTransform: 'uppercase'}}>{meta.type.replace('_', ' ')}</span>}
                  </div>
                </div>
                <div className={`tx-amount ${colorClass}`} style={!colorClass ? {color: meta.type === 'loan_lent' ? '#3b82f6' : '#f59e0b'} : {}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <span>{sign}${Math.abs(amount).toFixed(2)}</span>
                    <button 
                      onClick={() => handleDelete(log.id)}
                      style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', padding: '0 4px'}}
                      title="Delete Record"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="transactions-list" style={{marginTop: '2rem'}}>
        <h3>Scanned Document Records</h3>
        {logs.filter(log => {
          try { return JSON.parse(log.metadata_json).is_ocr; } catch { return false; }
        }).length === 0 ? (
          <div className="empty-state">
            <p>No scanned financial documents found.</p>
          </div>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '1rem', textAlign: 'left'}}>
              <thead>
                <tr style={{borderBottom: '1px solid var(--border)'}}>
                  <th style={{padding: '0.75rem', fontWeight: 600}}>Date</th>
                  <th style={{padding: '0.75rem', fontWeight: 600}}>Description</th>
                  <th style={{padding: '0.75rem', fontWeight: 600}}>Tag</th>
                  <th style={{padding: '0.75rem', fontWeight: 600}}>Amount</th>
                  <th style={{padding: '0.75rem', fontWeight: 600, textAlign: 'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.filter(log => {
                  try { return JSON.parse(log.metadata_json).is_ocr; } catch { return false; }
                }).map(log => {
                  let meta = {};
                  try { meta = JSON.parse(log.metadata_json); } catch { /* ignore */ }
                  
                  // Extract just the user's typed description before the [SCANNED DOC] or [TAG] part
                  const descMatch = log.raw_text.split(/\[TAG:|\[SCANNED DOC\]/i)[0].trim();
                  const description = descMatch || 'Untitled Scanned Document';
                  
                  return (
                    <tr key={`ocr-${log.id}`} style={{borderBottom: '1px solid var(--border)'}}>
                      <td style={{padding: '0.75rem'}}>{new Date(log.created_at).toLocaleDateString()}</td>
                      <td style={{padding: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={description}>
                        {description}
                      </td>
                      <td style={{padding: '0.75rem'}}>
                        {meta.financial_tag && (
                          <span style={{background: 'var(--text-primary)', color: 'var(--bg-card)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem'}}>
                            {meta.financial_tag}
                          </span>
                        )}
                      </td>
                      <td style={{padding: '0.75rem'}}>
                        {meta.amount ? `$${Math.abs(meta.amount).toFixed(2)}` : '-'}
                      </td>
                      <td style={{padding: '0.75rem', textAlign: 'right'}}>
                        <button 
                          onClick={() => alert(log.raw_text)}
                          style={{background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)'}}
                        >
                          View OCR
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
