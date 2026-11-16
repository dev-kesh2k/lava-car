import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageSpinner } from '@/components/ui/spinner';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthCallback } from '@/features/auth/AuthCallback';
import { LoginPage } from '@/features/auth/LoginPage';
import { CustomerHome } from '@/features/customer/CustomerHome';

// Telas do cliente carregam juntas (são as mais usadas); pátio e administração em pedaços separados.
const BookingWizard = lazy(() => import('@/features/booking/BookingWizard').then((m) => ({ default: m.BookingWizard })));
const GaragePage = lazy(() => import('@/features/garage/GaragePage').then((m) => ({ default: m.GaragePage })));
const LoyaltyPage = lazy(() => import('@/features/loyalty/LoyaltyPage').then((m) => ({ default: m.LoyaltyPage })));
const YardBoard = lazy(() => import('@/features/yard/YardBoard').then((m) => ({ default: m.YardBoard })));
const DashboardPage = lazy(() => import('@/features/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ServicesPage = lazy(() => import('@/features/admin/ServicesPage').then((m) => ({ default: m.ServicesPage })));
const TeamPage = lazy(() => import('@/features/admin/TeamPage').then((m) => ({ default: m.TeamPage })));
const CashflowPage = lazy(() => import('@/features/admin/CashflowPage').then((m) => ({ default: m.CashflowPage })));
const SettingsPage = lazy(() => import('@/features/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })));

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/entrar" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              <Route element={<ProtectedRoute area="customer" />}>
                <Route element={<AppShell />}>
                  <Route index element={<CustomerHome />} />
                  <Route path="agendar" element={<BookingWizard />} />
                  <Route path="garagem" element={<GaragePage />} />
                  <Route path="fidelidade" element={<LoyaltyPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute area="yard" />}>
                <Route element={<AppShell />}>
                  <Route path="patio" element={<YardBoard />} />
                </Route>
              </Route>

              <Route path="admin" element={<ProtectedRoute area="admin" />}>
                <Route element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="servicos" element={<ServicesPage />} />
                  <Route path="equipe" element={<TeamPage />} />
                  <Route path="caixa" element={<CashflowPage />} />
                  <Route path="loja" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
