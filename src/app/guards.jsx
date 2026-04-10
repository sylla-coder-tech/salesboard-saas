import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContextData } from '../features/auth/services/useAuthContext';

function CenterMessage({ title, message }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          textAlign: 'center',
        }}
      >
        <h2 style={{ marginBottom: '12px' }}>{title}</h2>
        <p style={{ margin: 0, color: '#475467', lineHeight: 1.6 }}>{message}</p>
      </div>
    </div>
  );
}

function isEntrepriseSubscriptionBlocked(entreprise) {
  const statut = String(entreprise?.statut_abonnement || '').toLowerCase();
  return statut === 'suspendu' || statut === 'expire';
}

function hasRequiredRole(userRole, allowedRoles = []) {
  const role = String(userRole || '').toLowerCase();
  return allowedRoles.map((r) => String(r).toLowerCase()).includes(role);
}

export function ProtectedRoute({ children }) {
  const { loading, profile, entreprise } = useAuthContextData();
  const location = useLocation();

  if (loading) {
    return <CenterMessage title="Chargement..." message="Vérification de votre session en cours." />;
  }

  if (!profile) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (profile?.role_plateforme === 'super_admin') {
    return children;
  }

  if (!entreprise) {
    return (
      <CenterMessage
        title="Entreprise introuvable"
        message="Votre compte n’est lié à aucune entreprise active pour le moment."
      />
    );
  }

  if (isEntrepriseSubscriptionBlocked(entreprise)) {
    const statut = String(entreprise?.statut_abonnement || '').toLowerCase();

    if (statut === 'suspendu') {
      return (
        <CenterMessage
          title="Abonnement suspendu"
          message="L’accès à cet espace a été suspendu. Veuillez contacter l’administrateur de la plateforme ou régulariser votre situation."
        />
      );
    }

    if (statut === 'expire') {
      return (
        <CenterMessage
          title="Abonnement expiré"
          message="L’abonnement de votre entreprise a expiré. Veuillez renouveler votre plan pour retrouver l’accès à votre espace."
        />
      );
    }
  }

  return children;
}

export function RoleRoute({ children, allowedRoles = [] }) {
  const { loading, profile, entreprise } = useAuthContextData();
  const location = useLocation();

  if (loading) {
    return <CenterMessage title="Chargement..." message="Vérification de vos autorisations..." />;
  }

  if (!profile) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (profile?.role_plateforme === 'super_admin') {
    return children;
  }

  if (!entreprise) {
    return (
      <CenterMessage
        title="Entreprise introuvable"
        message="Votre compte n’est lié à aucune entreprise active pour le moment."
      />
    );
  }

  if (isEntrepriseSubscriptionBlocked(entreprise)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!hasRequiredRole(profile?.role, allowedRoles)) {
    return (
      <CenterMessage
        title="Accès refusé"
        message="Vous n’avez pas les autorisations nécessaires pour accéder à cette page."
      />
    );
  }

  return children;
}

export function FeatureRoute({ children, check, title = 'Fonction indisponible', message }) {
  const { loading, profile, entreprise } = useAuthContextData();
  const location = useLocation();

  if (loading) {
    return <CenterMessage title="Chargement..." message="Vérification de votre plan..." />;
  }

  if (!profile) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (profile?.role_plateforme === 'super_admin') {
    return children;
  }

  if (!entreprise) {
    return (
      <CenterMessage
        title="Entreprise introuvable"
        message="Votre compte n’est lié à aucune entreprise active pour le moment."
      />
    );
  }

  if (isEntrepriseSubscriptionBlocked(entreprise)) {
    return <Navigate to="/dashboard" replace />;
  }

  const allowed = typeof check === 'function' ? check(entreprise) : true;

  if (!allowed) {
    return (
      <CenterMessage
        title={title}
        message={
          message ||
          "Votre plan actuel ne permet pas d’accéder à cette fonctionnalité. Veuillez passer à une offre supérieure."
        }
      />
    );
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { loading, profile } = useAuthContextData();

  if (loading) {
    return <CenterMessage title="Chargement..." message="Ouverture de l’application..." />;
  }

  if (profile) {
    if (profile?.role_plateforme === 'super_admin') {
      return <Navigate to="/admin-saas" replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export function SuperAdminRoute({ children }) {
  const { loading, profile } = useAuthContextData();
  const location = useLocation();

  if (loading) {
    return <CenterMessage title="Chargement..." message="Vérification de votre accès..." />;
  }

  if (!profile) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (profile?.role_plateforme !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}