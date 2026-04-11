import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../features/auth/pages/LoginPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import UpdatePasswordPage from '../features/auth/pages/UpdatePasswordPage';
import AcceptInvitationPage from '../features/auth/pages/AcceptInvitationPage';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import ProduitsPage from '../features/produits/pages/ProduitsPage';
import VentesPage from '../features/ventes/pages/VentesPage';
import ClientsPage from '../features/clients/pages/ClientsPage';
import DepensesPage from '../features/depenses/pages/DepensesPage';
import CreditsPage from '../features/credits/pages/CreditsPage';
import FacturesPage from '../features/factures/pages/FacturesPage';
import RapportsPage from '../features/rapports/pages/RapportsPage';
import SettingsPage from '../features/settings/pages/SettingsPage';
import StockPage from '../features/produits/pages/StockPage';
import AdminSaasPage from '../features/admin/pages/AdminSaasPage';
import AdminInvitationsPage from '../features/admin/pages/AdminInvitationsPage';
import TeamPage from '../features/team/pages/TeamPage';
import AppShell from '../components/layout/AppShell';
import AdminSaasShell from '../components/layout/AdminSaasShell';
import {
  FeatureRoute,
  ProtectedRoute,
  PublicOnlyRoute,
  RoleRoute,
  SuperAdminRoute,
} from './guards';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicOnlyRoute>
        <ForgotPasswordPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/update-password',
    element: <UpdatePasswordPage />,
  },
  {
    path: '/accept-invitation',
    element: <AcceptInvitationPage />,
  },

  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: (
          <RoleRoute allowedRoles={['owner', 'admin', 'vendeur', 'comptable', 'lecteur']}>
            <DashboardPage />
          </RoleRoute>
        ),
      },
      {
        path: 'produits',
        element: (
          <RoleRoute allowedRoles={['owner', 'admin', 'vendeur']}>
            <ProduitsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'stock',
        element: (
          <RoleRoute allowedRoles={['owner', 'admin', 'vendeur']}>
            <StockPage />
          </RoleRoute>
        ),
      },
      {
        path: 'ventes',
        element: (
          <RoleRoute allowedRoles={['owner', 'admin', 'vendeur']}>
            <VentesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'clients',
        element: (
          <RoleRoute allowedRoles={['owner', 'admin', 'vendeur', 'comptable']}>
            <ClientsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'depenses',
        element: (
          <RoleRoute allowedRoles={['owner', 'admin', 'comptable']}>
            <DepensesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'credits',
        element: (
          <FeatureRoute
            check={(entreprise) => Boolean(entreprise?.credits_actifs)}
            title="Crédits indisponibles"
            message="Votre plan actuel ne permet pas d’utiliser le module crédits."
          >
            <RoleRoute allowedRoles={['owner', 'admin', 'vendeur', 'comptable']}>
              <CreditsPage />
            </RoleRoute>
          </FeatureRoute>
        ),
      },
      {
        path: 'factures',
        element: (
          <FeatureRoute
            check={(entreprise) => Boolean(entreprise?.factures_actives)}
            title="Factures indisponibles"
            message="Votre plan actuel ne permet pas d’utiliser le module factures."
          >
            <RoleRoute allowedRoles={['owner', 'admin', 'comptable']}>
              <FacturesPage />
            </RoleRoute>
          </FeatureRoute>
        ),
      },
      {
        path: 'rapports',
        element: (
          <FeatureRoute
            check={(entreprise) => Boolean(entreprise?.rapports_avances_actifs)}
            title="Rapports avancés indisponibles"
            message="Votre plan actuel ne permet pas d’accéder aux rapports avancés."
          >
            <RoleRoute allowedRoles={['owner', 'admin', 'comptable']}>
              <RapportsPage />
            </RoleRoute>
          </FeatureRoute>
        ),
      },
      {
        path: 'equipe',
        element: (
          <RoleRoute allowedRoles={['owner', 'admin']}>
            <TeamPage />
          </RoleRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <RoleRoute allowedRoles={['owner', 'admin']}>
            <SettingsPage />
          </RoleRoute>
        ),
      },
    ],
  },

  {
    path: '/admin-saas',
    element: (
      <SuperAdminRoute>
        <AdminSaasShell />
      </SuperAdminRoute>
    ),
    children: [
      { index: true, element: <AdminSaasPage /> },
      { path: 'invitations', element: <AdminInvitationsPage /> },
    ],
  },
]);