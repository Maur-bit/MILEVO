'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/shared/Toast';

export function ConnectionStatus() {
  const [offline, setOffline] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const updateOffline = () => setOffline(true);
    const updateOnline = () => {
      setOffline(false);
      toast("You're back online.");
    };

    setOffline(!navigator.onLine);
    window.addEventListener('offline', updateOffline);
    window.addEventListener('online', updateOnline);
    return () => {
      window.removeEventListener('offline', updateOffline);
      window.removeEventListener('online', updateOnline);
    };
  }, [toast]);

  if (!offline) return null;

  return (
    <div
      className="sticky top-0 z-[250] bg-milevo-ink px-4 py-2 text-center text-sm text-white"
      role="status"
      aria-live="polite"
    >
      You&apos;re offline. Some features may not work until your connection returns.
    </div>
  );
}
