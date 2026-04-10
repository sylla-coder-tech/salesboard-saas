import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { signOutUser } from '../../features/auth/services/authService';
import { useAuthContextData } from '../../features/auth/services/useAuthContext';

const adminMenuItems = [
  { label: 'Dashboard SaaS', path: '/admin-saas' },
  { label: 'Invitations', path: '/admin-saas/invitations' },
];

export default function AdminSaasShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { loading, profile } = useAuthContextData();

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
            <span>S</span>
          </div>

          <h2>SalesBoard SaaS</h2>
          <p>
            {loading
              ? 'Chargement du compte...'
              : profile?.role_plateforme === 'super_admin'
              ? 'Espace Super Admin'
              : 'Administration plateforme'}
          </p>
        </div>

        <nav className="sidebar-nav">
          {adminMenuItems.map((item) => (
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

          <div className="mobile-brand">
            <span>SalesBoard SaaS</span>
          </div>

          <button className="ghost-topbar-btn" onClick={handleLogout}>
            Sortir
          </button>
        </div>

        <header className="topbar">
          <div className="topbar-brand-wrap">
            <div className="topbar-brand-logo">
              <span>S</span>
            </div>

            <div>
              <h1>Administration SaaS</h1>
              <p>
                {loading
                  ? 'Chargement des informations...'
                  : `Bienvenue${profile?.nom_complet ? `, ${profile.nom_complet}` : ''}. Gérez les entreprises, abonnements et invitations de la plateforme.`}
              </p>
            </div>
          </div>

          <button className="ghost-topbar-btn desktop-only" onClick={handleLogout}>
            Déconnexion
          </button>
        </header>

        <main className="page-content">
          <div className="page-section">
            <Outlet context={{ profile }} />
          </div>
        </main>
      </div>
    </div>
  );
}