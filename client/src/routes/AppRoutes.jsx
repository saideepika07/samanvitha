import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';

// Route Guards
import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';
import { ROLES } from '../config/roles.js';

// Route-level Lazy Loaded Pages
const LandingPage = React.lazy(() => import('../pages/public/LandingPage.jsx'));
const RegisterPage = React.lazy(() => import('../pages/public/RegisterPage.jsx'));
const LoginPage = React.lazy(() => import('../pages/public/LoginPage.jsx'));
const ForgotPasswordPage = React.lazy(() => import('../pages/public/ForgotPasswordPage.jsx'));
const ResetPasswordPage = React.lazy(() => import('../pages/public/ResetPasswordPage.jsx'));
const PublicNeedsBoard = React.lazy(() => import('../pages/public/PublicNeedsBoard.jsx'));
const NotFoundPage = React.lazy(() => import('../pages/public/NotFoundPage.jsx'));

// Role Dashboards
const DonorDashboardPage = React.lazy(() => import('../pages/donor/DonorDashboardPage.jsx'));
const InstitutionDashboardPage = React.lazy(() => import('../pages/institution/InstitutionDashboardPage.jsx'));
const AdminDashboardPage = React.lazy(() => import('../pages/admin/AdminDashboardPage.jsx'));

// Donor Pages
const CreateDonationPage = React.lazy(() => import('../pages/donor/CreateDonationPage.jsx'));
const MyDonationsPage = React.lazy(() => import('../pages/donor/MyDonationsPage.jsx'));
const DonorProfilePage = React.lazy(() => import('../pages/donor/DonorProfilePage.jsx'));
const MatchSuggestionsPage = React.lazy(() => import('../pages/donor/MatchSuggestionsPage.jsx'));
const DonorNotificationsPage = React.lazy(() => import('../pages/donor/DonorNotificationsPage.jsx'));

// Institution Pages
const CreateEditNeedPage = React.lazy(() => import('../pages/institution/CreateEditNeedPage.jsx'));
const MyNeedsPage = React.lazy(() => import('../pages/institution/MyNeedsPage.jsx'));
const IncomingRequestsPage = React.lazy(() => import('../pages/institution/IncomingRequestsPage.jsx'));
const ReceivedDonationsPage = React.lazy(() => import('../pages/institution/ReceivedDonationsPage.jsx'));
const VerificationStatusPage = React.lazy(() => import('../pages/institution/VerificationStatusPage.jsx'));
const InstitutionProfilePage = React.lazy(() => import('../pages/institution/InstitutionProfilePage.jsx'));
const InstitutionNotificationsPage = React.lazy(() => import('../pages/institution/InstitutionNotificationsPage.jsx'));

// Admin Pages
const InstitutionVerificationReviewPage = React.lazy(() => import('../pages/admin/InstitutionVerificationReviewPage.jsx'));
const VerificationDetailPage = React.lazy(() => import('../pages/admin/VerificationDetailPage.jsx'));
const UsersListPage = React.lazy(() => import('../pages/admin/UsersListPage.jsx'));
const DisputesListPage = React.lazy(() => import('../pages/admin/DisputesListPage.jsx'));

// Accessible Loading Fallback during chunk loading
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-8">
      <div
        className="w-8 h-8 border-3 border-sage-600 border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label="Loading page content..."
      />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/public-needs" element={<PublicNeedsBoard />} />
      </Route>

      {/* Auth Pages (Public / Guest) */}
      <Route element={<AuthLayout />}>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected Donor Pages */}
      <Route
        path="/donor"
        element={
          <ProtectedRoute>
            <RoleRoute role={ROLES.DONOR}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="" element={<Navigate to="/donor/dashboard" replace />} />
        <Route path="dashboard" element={<DonorDashboardPage />} />
        <Route path="create-donation" element={<CreateDonationPage />} />
        <Route path="my-donations" element={<MyDonationsPage />} />
        <Route path="matches" element={<MatchSuggestionsPage />} />
        <Route path="notifications" element={<DonorNotificationsPage />} />
        <Route path="profile" element={<DonorProfilePage />} />
      </Route>

      {/* Protected Institution Pages */}
      <Route
        path="/institution"
        element={
          <ProtectedRoute>
            <RoleRoute role={ROLES.INSTITUTION}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="" element={<Navigate to="/institution/dashboard" replace />} />
        <Route path="dashboard" element={<InstitutionDashboardPage />} />
        <Route path="needs/new" element={<CreateEditNeedPage />} />
        <Route path="needs/:id/edit" element={<CreateEditNeedPage />} />
        <Route path="my-needs" element={<MyNeedsPage />} />
        <Route path="incoming-requests" element={<IncomingRequestsPage />} />
        <Route path="received-donations" element={<ReceivedDonationsPage />} />
        <Route path="verification-status" element={<VerificationStatusPage />} />
        <Route path="notifications" element={<InstitutionNotificationsPage />} />
        <Route path="profile" element={<InstitutionProfilePage />} />
      </Route>

      {/* Protected Admin Pages */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RoleRoute role={ROLES.ADMIN}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="verifications" element={<InstitutionVerificationReviewPage />} />
        <Route path="verifications/:id" element={<VerificationDetailPage />} />
        <Route path="users" element={<UsersListPage />} />
        <Route path="disputes" element={<DisputesListPage />} />
      </Route>

      {/* 404 Fallback */}
      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </Suspense>
  );
}

export default AppRoutes;
