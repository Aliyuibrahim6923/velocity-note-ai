import { useState, useCallback, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { usePlaidLink } from 'react-plaid-link';

export function Settings({ isOpen, onClose, onGoogleToken }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [plaidToken, setPlaidToken] = useState(null);
  const [isBankLinked, setIsBankLinked] = useState(false);

  useEffect(() => {
    if (isOpen && !plaidToken) {
      fetch('/api/link/token/create', { method: 'POST' })
        .then(res => res.json())
        .then(data => setPlaidToken(data.link_token))
        .catch(e => console.error("Failed to fetch Plaid link token:", e));
    }
  }, [isOpen, plaidToken]);

  const onSuccess = useCallback(async (public_token) => {
    try {
      await fetch('/api/link/token/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token })
      });
      setIsBankLinked(true);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: plaidToken,
    onSuccess,
  });

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setIsAuthenticated(true);
      if (onGoogleToken) {
        onGoogleToken(tokenResponse.access_token);
      }
    },
    onError: (error) => console.error('Login Failed:', error),
    scope: 'https://www.googleapis.com/auth/drive.file'
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <header className="modal-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>

        <section className="settings-section">
          <h3>Google Integration</h3>
          <p>Link your Google account to automatically export financial logs and other tagged items to your Drive.</p>
          
          {!isAuthenticated ? (
            <button className="google-btn" onClick={() => login()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
              Sign in with Google
            </button>
          ) : (
            <div className="auth-success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Account Linked Successfully</span>
            </div>
          )}
        </section>

        <section className="settings-section">
          <h3>Reminders & Alarms</h3>
          <p>We use native browser notifications. Make sure you allow notifications when prompted by your browser to ensure you never miss an action item.</p>
          <button className="secondary-btn" onClick={() => Notification.requestPermission()}>
            Test Permissions
          </button>
        </section>

        <section className="settings-section">
          <h3>The Wallet (Bank Sync)</h3>
          <p>Link your financial institution to passively track transactions and automatically sync your ledger.</p>
          {!isBankLinked ? (
            <button 
              className="google-btn" 
              onClick={() => open()} 
              disabled={!ready}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
              Link Bank Account
            </button>
          ) : (
            <div className="auth-success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Bank Linked Successfully</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
