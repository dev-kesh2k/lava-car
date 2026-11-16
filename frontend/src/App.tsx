import { useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { ADMIN_SIDE, ADMIN_TABS, CLIENT_SIDE, CLIENT_TABS, OPERATOR_TABS, TabsLayout } from './layout';
import { Loading, Toaster } from './ui';
import AdminLogin from './pages/auth/Login';
import Home from './pages/client/Home';
import Book from './pages/client/Book';
import Bookings from './pages/client/Bookings';
import BookingDetail from './pages/client/BookingDetail';
import Garage from './pages/client/Garage';
import LoyaltyPage from './pages/client/Loyalty';
import Profile from './pages/client/Profile';
import PersonalInfo from './pages/client/PersonalInfo';
import Help from './pages/client/Help';
import Feedback from './pages/client/Feedback';
import About from './pages/client/About';
import AdminFeedback from './pages/admin/Feedback';
import Notifications from './pages/Notifications';
import Yard from './pages/admin/Yard';
import Dashboard from './pages/admin/Dashboard';
import Agenda from './pages/admin/Agenda';
import Team from './pages/admin/Team';
import Services from './pages/admin/Services';
import Cash from './pages/admin/Cash';
import Commissions from './pages/admin/Commissions';
import More from './pages/admin/More';
import Settings from './pages/admin/Settings';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Equipe logada (admin ou operador); `owner` = só o dono. */
function RequireStaff({ children, owner }: { children: ReactNode; owner?: boolean }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (owner && user.role !== 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function StaffLayout() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <TabsLayout tabs={ADMIN_TABS} side={ADMIN_SIDE} admin /> : <TabsLayout tabs={OPERATOR_TABS} admin />;
}

const owner = (el: ReactNode) => <RequireStaff owner>{el}</RequireStaff>;

export default function App() {
  return (
    <>
      <ScrollTop />
      <Toaster />
      <Routes>
        {/* Cliente: sem login, identificado pelo celular */}
        <Route element={<TabsLayout tabs={CLIENT_TABS} side={CLIENT_SIDE} />}>
          <Route path="/" element={<Home />} />
          <Route path="/agenda" element={<Bookings />} />
          <Route path="/agenda/:id" element={<BookingDetail />} />
          <Route path="/garagem" element={<Garage />} />
          <Route path="/fidelidade" element={<LoyaltyPage />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/perfil/ajuda" element={<Help />} />
          <Route path="/perfil/feedback" element={<Feedback />} />
          <Route path="/sobre" element={<About />} />
        </Route>
        <Route path="/agendar" element={<Book />} />

        {/* Equipe: login obrigatório (operador vê o pátio e a agenda; o dono vê tudo) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          element={
            <RequireStaff>
              <StaffLayout />
            </RequireStaff>
          }
        >
          <Route path="/admin" element={<Yard />} />
          <Route path="/admin/agenda" element={<Agenda />} />
          <Route path="/admin/conta" element={<PersonalInfo />} />
          <Route path="/admin/notificacoes" element={<Notifications />} />
          <Route path="/admin/painel" element={owner(<Dashboard />)} />
          <Route path="/admin/caixa" element={owner(<Cash />)} />
          <Route path="/admin/comissoes" element={owner(<Commissions />)} />
          <Route path="/admin/equipe" element={owner(<Team />)} />
          <Route path="/admin/servicos" element={owner(<Services />)} />
          <Route path="/admin/config" element={owner(<Settings />)} />
          <Route path="/admin/feedback" element={owner(<AdminFeedback />)} />
          <Route path="/admin/mais" element={owner(<More />)} />
        </Route>
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
