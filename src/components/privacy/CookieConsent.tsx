'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

const CONSENT_KEY = 'milevo-analytics-consent';
const CONSENT_COOKIE = 'milevo-analytics-consent';

function readConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

function saveConsent(allowed: boolean) {
  const value = allowed ? 'yes' : 'no';
  localStorage.setItem(CONSENT_KEY, value);
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      setVisible(saved !== 'yes' && saved !== 'no');
      setAnalyticsAllowed(saved === 'yes');
    } catch {
      setVisible(true);
    }

    const openSettings = () => {
      const saved = readConsent();
      setAnalyticsAllowed(saved === 'yes');
      setSettingsOpen(true);
      setVisible(false);
    };
    window.addEventListener('milevo:privacy-settings', openSettings);
    return () => window.removeEventListener('milevo:privacy-settings', openSettings);
  }, []);

  const commit = (allowed: boolean) => {
    try {
      saveConsent(allowed);
      window.location.reload();
    } catch {
      setVisible(true);
      setSettingsOpen(false);
    }
  };

  if (!visible && !settingsOpen) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[100] mx-auto max-h-[70vh] max-w-xl overflow-y-auto rounded-lg border border-milevo-border bg-milevo-white p-4 text-milevo-text shadow-xl md:inset-x-6 md:bottom-6"
      role="region" aria-label="Privacy preferences">
      <h2 id="privacy-preferences-title" className="font-semibold">
        {settingsOpen ? 'Privacy preferences' : 'Your privacy choices'}
      </h2>
      <p className="mt-1 text-sm text-milevo-muted">
        Essential storage supports site features such as your theme and sign-in. Optional analytics (PostHog and browser error monitoring) is off unless you allow it. Your choice is saved on this device.
      </p>
      {settingsOpen && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={analyticsAllowed} onChange={(event) => setAnalyticsAllowed(event.target.checked)} />
          Allow optional analytics and browser error monitoring
        </label>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {settingsOpen && (
          <Button type="button" variant="secondary" onClick={() => setSettingsOpen(false)}>Cancel</Button>
        )}
        {!settingsOpen && (
          <Button type="button" variant="secondary" onClick={() => commit(false)}>Reject optional</Button>
        )}
        <Button type="button" variant="secondary" onClick={() => {
          if (settingsOpen) commit(analyticsAllowed);
          else {
            setAnalyticsAllowed(readConsent() === 'yes');
            setSettingsOpen(true);
            setVisible(false);
          }
        }}>
          {settingsOpen ? 'Save preferences' : 'Manage preferences'}
        </Button>
        {!settingsOpen && <Button type="button" onClick={() => commit(true)}>Allow optional</Button>}
      </div>
    </div>
  );
}
