import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { signOutUser } from '../../features/auth/services/authService';
import { useAuthContextData } from '../../features/auth/services/useAuthContext';

const menuItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    roles: ['owner', 'admin', 'vendeur', 'comptable', 'lecteur'],
    isEnabled: () => true,
  },
  {
    label: 'Produits',
    path: '/produits',
    roles: ['owner', 'admin', 'vendeur'],
    isEnabled: () => true,
  },
  {
    label: 'Stock',
    path: '/stock',
    roles: ['owner', 'admin', 'vendeur'],
    isEnabled: () => true,
  },
  {
    label: 'Ventes',
    path: '/ventes',
    roles: ['owner', 'admin', 'vendeur'],
    isEnabled: () => true,
  },
  {
    label: 'Clients',
    path: '/clients',
    roles: ['owner', 'admin', 'vendeur'],
    isEnabled: () => true,
  },
  {
    label: 'Dépenses',
    path: '/depenses',
    roles: ['owner', 'admin', 'comptable'],
    isEnabled: () => true,
  },
  {
    label: 'Crédits',
    path: '/credits',
    roles: ['owner', 'admin', 'comptable'],
    isEnabled: (entreprise) => Boolean(entreprise?.credits_actifs),
  },
  {
    label: 'Factures',
    path: '/factures',
    roles: ['owner', 'admin', 'comptable'],
    isEnabled: (entreprise) => Boolean(entreprise?.factures_actives),
  },
  {
    label: 'Rapports',
    path: '/rapports',
    roles: ['owner', 'admin', 'comptable'],
    isEnabled: (entreprise) => Boolean(entreprise?.rapports_avances_actifs),
  },
  
  {
    label: 'Équipe',
    path: '/equipe',
    roles: ['owner', 'admin'],
    isEnabled: () => true,
  },
  {
    label: 'Paramètres',
    path: '/settings',
    roles: ['owner', 'admin'],
    isEnabled: () => true,
  },
];

function hasRole(userRole, allowedRoles = []) {
  return allowedRoles.includes(String(userRole || '').toLowerCase());
}

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { loading, profile, entreprise } = useAuthContextData();

  const visibleMenuItems = useMemo(() => {
    const role = String(profile?.role || '').toLowerCase();

    return menuItems.filter((item) => {
      const roleAllowed = hasRole(role, item.roles);
      const featureEnabled = item.isEnabled(entreprise);
      return roleAllowed && featureEnabled;
    });
  }, [profile?.role, entreprise]);

  async function handleLogout() {
    try {
      await signOutUser();
      setMobileMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Erreur de déconnexion :', error.message);
    }
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function toggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
  }

  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-shell">
      {mobileMenuOpen && <div className="mobile-overlay" onClick={closeMobileMenu} />}

      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="brand-box">
          <div className="sidebar-brand-logo">
            {entreprise?.logo_url ? (
              <img src={entreprise.logo_url} alt={entreprise.nom || 'Entreprise'} />
            ) : (
              <span>{(entreprise?.nom || 'E')[0].toUpperCase()}</span>
            )}
          </div>

          <h2>{loading ? 'Chargement...' : entreprise?.nom || 'SalesBoard'}</h2>
          <p>
            {loading
              ? 'Chargement du compte...'
              : profile?.role
              ? `Espace ${profile.role}`
              : 'Gestion commerciale premium pour entreprises'}
          </p>
        </div>

        <nav className="sidebar-nav">
          {visibleMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeMobileMenu}
              className={location.pathname === item.path ? 'nav-link active' : 'nav-link'}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="main-layout">
        <div className="mobile-topbar">
          <button className="menu-toggle-btn" onClick={toggleMobileMenu} aria-label="Ouvrir le menu">
            ☰
          </button>

          <div className="mobile-brand mobile-brand-with-logo">
            <div className="mobile-brand-logo">
              {entreprise?.logo_url ? (
                <img src={entreprise.logo_url} alt={entreprise.nom || 'Entreprise'} />
              ) : (
                <span>{(entreprise?.nom || 'E')[0].toUpperCase()}</span>
              )}
            </div>

            <span>{loading ? '...' : entreprise?.nom || 'SalesBoard'}</span>
          </div>

          <button className="ghost-topbar-btn" onClick={handleLogout}>
            Sortir
          </button>
        </div>

        <header className="topbar">
          <div className="topbar-brand-wrap">
            <div className="topbar-brand-logo">
              {entreprise?.logo_url ? (
                <img src={entreprise.logo_url} alt={entreprise.nom || 'Entreprise'} />
              ) : (
                <span>{(entreprise?.nom || 'E')[0].toUpperCase()}</span>
              )}
            </div>

            <div>
              <h1>{loading ? 'Chargement...' : entreprise?.nom || 'Espace de gestion'}</h1>
              <p>
                {loading
                  ? 'Chargement des informations de votre entreprise...'
                  : `Bienvenue${profile?.nom_complet ? `, ${profile.nom_complet}` : ''}. Gérez vos ventes, crédits, dépenses et performances en temps réel.`}
              </p>
            </div>
          </div>

          <button className="ghost-topbar-btn desktop-only" onClick={handleLogout}>
            Déconnexion
          </button>
        </header>

        <main className="page-content">
          <div className="page-section">
            <Outlet context={{ profile, entreprise }} />
          </div>
        </main>
      </div>
    </div>
  );
}