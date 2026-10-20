import { useEffect, useState, useCallback } from 'react';

export interface VersionInfo {
  version: string;
  buildTime: string;
  name: string;
  changelog?: string;
}

export const CURRENT_CLIENT_VERSION = '1.0.0';

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [newVersionInfo, setNewVersionInfo] = useState<VersionInfo | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkStatus, setCheckStatus] = useState<string | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check version JSON and Service Worker
  const checkForUpdates = useCallback(async (manual = false) => {
    setIsChecking(true);
    setCheckStatus(manual ? 'Prüfe auf Updates...' : null);

    try {
      // 1. Service Worker update check
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          setSwRegistration(reg);
          try {
            await reg.update();
            if (reg.waiting) {
              setUpdateAvailable(true);
              setNewVersionInfo({
                version: '1.0.1',
                buildTime: new Date().toISOString(),
                name: 'DriveEnglish PWA Update',
                changelog: 'Neuer Service Worker Stand verfügbar. Optimierte Performance und Korrekturen.',
              });
              setIsChecking(false);
              return;
            }
          } catch (e) {
            // Ignore offline update error
          }
        }
      }

      // 2. Network version.json check with cache busting
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const data: VersionInfo = await res.json();
        const storedLastKnown = localStorage.getItem('drive_english_last_known_build');

        if (storedLastKnown && storedLastKnown !== data.buildTime) {
          setUpdateAvailable(true);
          setNewVersionInfo(data);
          if (manual) {
            setCheckStatus('Neues Update gefunden!');
          }
        } else {
          // Store first time
          if (!storedLastKnown) {
            localStorage.setItem('drive_english_last_known_build', data.buildTime);
          }
          if (manual) {
            setCheckStatus('App ist auf dem neuesten Stand (v' + CURRENT_CLIENT_VERSION + ')');
            setTimeout(() => setCheckStatus(null), 3000);
          }
        }
      }
    } catch (err) {
      console.warn('Update check error:', err);
      if (manual) {
        setCheckStatus('Prüfung fehlgeschlagen (offline)');
        setTimeout(() => setCheckStatus(null), 3000);
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Initial check on launch
    checkForUpdates(false);

    // Check when user navigates back to app (visibilitychange)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Listen for service worker update events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New SW took control
      });

      navigator.serviceWorker.ready.then((reg) => {
        setSwRegistration(reg);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
                setNewVersionInfo({
                  version: '1.0.1',
                  buildTime: new Date().toISOString(),
                  name: 'DriveEnglish Update',
                  changelog: 'Neuer Service Worker Stand verfügbar. Schnellerer App-Start und flüssigerer Car-Mode.',
                });
              }
            });
          }
        });
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkForUpdates]);

  // 1-Click Update action
  const performUpdate = async () => {
    try {
      // 1. Tell waiting service worker to skipWaiting
      if (swRegistration && swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 2. Clear all cache storages
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // 3. Update build time in localStorage so it doesn't pop up again
      if (newVersionInfo?.buildTime) {
        localStorage.setItem('drive_english_last_known_build', newVersionInfo.buildTime);
      }

      // 4. Hard reload page to fetch freshest code
      window.location.reload();
    } catch (err) {
      console.error('Failed to perform clean update:', err);
      window.location.reload();
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  return {
    currentVersion: CURRENT_CLIENT_VERSION,
    updateAvailable,
    newVersionInfo,
    isChecking,
    checkStatus,
    checkForUpdates,
    performUpdate,
    dismissUpdate,
  };
}
