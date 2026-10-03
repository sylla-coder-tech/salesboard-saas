import { useEffect, useState } from 'react';

/**
 * Détecte si l'appareil est iOS (iPhone / iPad)
 */
function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Détecte si l'app est déjà installée (mode standalone)
 */
function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function PWAInstallPrompt() {
  // Événement natif Android/Chrome
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  // Afficher la bannière iOS manuelle
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  // Bannière Android
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  // Bannière fermée par l'utilisateur
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Si déjà installée ou déjà refusée dans cette session, on ne montre rien
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem('pwa-prompt-dismissed')) return;

    if (isIOS()) {
      // iOS : afficher la bannière manuelle après 3 secondes
      const timer = setTimeout(() => setShowIOSBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome : capturer l'événement natif
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidBanner(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroidBanner(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    setShowAndroidBanner(false);
    setShowIOSBanner(false);
    sessionStorage.setItem('pwa-prompt-dismissed', '1');
  }

  if (dismissed) return null;

  // ── Bannière Android ──────────────────────────────────────────────────────
  if (showAndroidBanner) {
    return (
      <div style={styles.banner}>
        <div style={styles.left}>
          <img src="/pwa-64x64.png" alt="SalesBoard" style={styles.icon} />
          <div>
            <p style={styles.title}>Installer SalesBoard</p>
            <p style={styles.subtitle}>Accès rapide depuis votre écran d'accueil</p>
          </div>
        </div>
        <div style={styles.actions}>
          <button style={styles.installBtn} onClick={handleAndroidInstall}>
            Installer
          </button>
          <button style={styles.closeBtn} onClick={handleDismiss} aria-label="Fermer">
            ✕
          </button>
        </div>
      </div>
    );
  }

  // ── Bannière iOS ──────────────────────────────────────────────────────────
  if (showIOSBanner) {
    return (
      <div style={styles.banner}>
        <div style={styles.left}>
          <img src="/pwa-64x64.png" alt="SalesBoard" style={styles.icon} />
          <div>
            <p style={styles.title}>Installer SalesBoard</p>
            <p style={styles.subtitle}>
              Appuyez sur{' '}
              <span style={styles.iosShare}>⎙</span>{' '}
              puis <strong>« Ajouter à l'écran d'accueil »</strong>
            </p>
          </div>
        </div>
        <div style={styles.actions}>
          <button style={styles.closeBtn} onClick={handleDismiss} aria-label="Fermer">
            ✕
          </button>
        </div>
        {/* Flèche pointant vers le bas (barre Safari) */}
        <div style={styles.iosArrow} />
      </div>
    );
  }

  return null;
}

// ── Styles inline (pas de dépendance externe) ─────────────────────────────
const styles = {
  banner: {
    position: 'fixed',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 32px)',
    maxWidth: '480px',
    background: '#1e293b',
    color: '#f1f5f9',
    borderRadius: '14px',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    zIndex: 9999,
    gap: '10px',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: 0,
  },
  icon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontWeight: '700',
    fontSize: '14px',
    lineHeight: '1.3',
    whiteSpace: 'nowrap',
  },
  subtitle: {
    margin: '2px 0 0',
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.4',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  installBtn: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '7px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  closeBtn: {
    background: 'transparent',
    color: '#94a3b8',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 6px',
    lineHeight: 1,
  },
  iosShare: {
    fontSize: '15px',
    verticalAlign: 'middle',
  },
  iosArrow: {
    position: 'absolute',
    bottom: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '8px solid #1e293b',
  },
};
