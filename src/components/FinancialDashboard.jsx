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
            } else if (meta.type === 'income' || (amount > 0 && !meta.type)) {
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
                  {sign}${Math.abs(amount).toFixed(2)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
