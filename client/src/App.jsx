import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { ToastProvider } from './components/ToastContext';
import { AppShell, PageLoader, RequireAuth } from './components/Layout';

const HomePage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.HomePage })));
const ListingsPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.ListingsPage })));
const ItemDetailsPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.ItemDetailsPage })));
const ReportPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.ReportPage })));
const LoginPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.RegisterPage })));
const InfoPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.InfoPage })));
const UserDashboardPage = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.UserDashboardPage })));
const ProfilePage = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.ProfilePage })));
const AdminDashboardPage = lazy(() => import('./pages/Admin').then((module) => ({ default: module.AdminDashboardPage })));
const AdminItemsPage = lazy(() => import('./pages/Admin').then((module) => ({ default: module.AdminItemsPage })));
const AdminClaimsPage = lazy(() => import('./pages/Admin').then((module) => ({ default: module.AdminClaimsPage })));
const AdminUsersPage = lazy(() => import('./pages/Admin').then((module) => ({ default: module.AdminUsersPage })));

function RouteView({ children, role }) { return <AppShell><RequireAuth role={role}>{children}</RequireAuth></AppShell>; }

export default function App() {
  return <BrowserRouter><AuthProvider><ToastProvider><Suspense fallback={<PageLoader label="Loading page" />}><Routes>
    <Route path="/" element={<AppShell><HomePage /></AppShell>} />
    <Route path="/lost" element={<AppShell><ListingsPage type="Lost" /></AppShell>} />
    <Route path="/found" element={<AppShell><ListingsPage type="Found" /></AppShell>} />
    <Route path="/search" element={<AppShell><ListingsPage /></AppShell>} />
    <Route path="/items/:id" element={<AppShell><ItemDetailsPage /></AppShell>} />
    <Route path="/how-it-works" element={<AppShell><InfoPage kind="how" /></AppShell>} />
    <Route path="/about" element={<AppShell><InfoPage kind="about" /></AppShell>} />
    <Route path="/login" element={<AppShell><LoginPage /></AppShell>} />
    <Route path="/register" element={<AppShell><RegisterPage /></AppShell>} />
    <Route path="/report/lost" element={<RouteView><ReportPage type="Lost" /></RouteView>} />
    <Route path="/report/found" element={<RouteView><ReportPage type="Found" /></RouteView>} />
    <Route path="/dashboard" element={<RouteView><UserDashboardPage /></RouteView>} />
    <Route path="/dashboard/reports" element={<RouteView><UserDashboardPage section="reports" /></RouteView>} />
    <Route path="/dashboard/claims" element={<RouteView><UserDashboardPage section="claims" /></RouteView>} />
    <Route path="/dashboard/notifications" element={<RouteView><UserDashboardPage section="notifications" /></RouteView>} />
    <Route path="/profile" element={<RouteView><ProfilePage /></RouteView>} />
    <Route path="/admin" element={<RouteView role="admin"><AdminDashboardPage /></RouteView>} />
    <Route path="/admin/items" element={<RouteView role="admin"><AdminItemsPage /></RouteView>} />
    <Route path="/admin/claims" element={<RouteView role="admin"><AdminClaimsPage /></RouteView>} />
    <Route path="/admin/users" element={<RouteView role="admin"><AdminUsersPage /></RouteView>} />
    <Route path="*" element={<AppShell><InfoPage kind="not-found" /></AppShell>} />
  </Routes></Suspense></ToastProvider></AuthProvider></BrowserRouter>;
}
