// This file defines the main application routes.
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Opportunities from './pages/Opportunities.jsx';
import OpportunityDetail from './pages/OpportunityDetail.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import About from './pages/About.jsx';
import Organisations from './pages/Organisations.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import VerifyResetOtp from './pages/VerifyResetOtp.jsx';
import NewPassword from './pages/NewPassword.jsx';
import TwoFactorLogin from './pages/TwoFactorLogin.jsx';

// Show protected pages only after the user is signed in.
function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page-loader"><span className="spinner" /></div>;
  return user ? children : <Navigate to="/login" state={{ from: location }} replace />;
}

// Connect URL paths to the correct page component.
// Connect URL paths to the correct page component.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="opportunities" element={<Opportunities />} />
        <Route path="opportunities/:id" element={<OpportunityDetail />} />
        <Route path="organisations" element={<Organisations />} />
        <Route path="about" element={<About />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="login/verify-2fa" element={<TwoFactorLogin />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="forgot-password/verify" element={<VerifyResetOtp />} />
        <Route path="forgot-password/new" element={<NewPassword />} />
        <Route path="dashboard/*" element={<Protected><Dashboard /></Protected>} />
        <Route path="profile" element={<Protected><Profile /></Protected>} />
        <Route path="*" element={<main className="empty-state container"><p className="eyebrow">404</p><h1>That path wandered off.</h1><a className="button primary" href="/">Back home</a></main>} />
      </Route>
    </Routes>
  );
}
