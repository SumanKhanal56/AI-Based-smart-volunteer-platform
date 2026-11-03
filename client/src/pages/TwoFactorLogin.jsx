// This page verifies the login code for two-factor authentication.
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import RecoveryShell from '../components/RecoveryShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const inputClass = 'mt-2 h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-xl font-extrabold tracking-[.45em] outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

// Complete login using the six-digit code sent by email.
export default function TwoFactorLogin() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, completeTwoFactorLogin, resendTwoFactorLogin } = useAuth();
  const challengeToken = sessionStorage.getItem('two_factor_challenge') || '';
  const maskedEmail = location.state?.maskedEmail || sessionStorage.getItem('two_factor_masked_email') || 'your registered email';
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('We sent a six-digit verification code to ' + maskedEmail + '.');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // Remove temporary login details after success, expiry, or cancellation.
  function clearChallenge() {
    sessionStorage.removeItem('two_factor_challenge');
    sessionStorage.removeItem('two_factor_masked_email');
  }

  // Send the OTP and challenge token to complete authentication.
  async function verify(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await completeTwoFactorLogin({ challengeToken, otp });
      const returnTo = sessionStorage.getItem('two_factor_return_to') || '/dashboard';
      clearChallenge();
      sessionStorage.removeItem('two_factor_return_to');
      navigate(returnTo, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  // Request a new OTP while keeping the same login challenge.
  async function resend() {
    if (cooldown > 0 || busy) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const data = await resendTwoFactorLogin(challengeToken);
      setOtp('');
      setMessage(data.message + ' Check ' + (data.maskedEmail || maskedEmail) + '.');
      setCooldown(60);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!challengeToken) {
    return <RecoveryShell eyebrow="Two-factor authentication" title="Verification session expired" description="Enter your email and password again to request a new verification code.">
      <Link className="mt-8 flex h-13 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white" to="/login">Return to sign in <ArrowRight size={18} /></Link>
    </RecoveryShell>;
  }

  return <RecoveryShell eyebrow="Two-factor authentication" title="Confirm it is you" description="Complete this extra security step before Volunteer Nepal creates your signed-in session.">
    {message && <div className="mt-7 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800"><ShieldCheck className="mt-0.5 shrink-0" size={19} />{message}</div>}
    <form className="mt-7 grid gap-5" onSubmit={verify}>
      <label className="text-sm font-bold text-slate-700">Verification code
        <input required autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" className={inputClass} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" />
      </label>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold leading-6 text-rose-700">{error}</div>}
      <button className="flex h-13 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/15 transition hover:bg-emerald-700 disabled:opacity-60" disabled={busy || otp.length !== 6}>
        {busy ? 'Verifying…' : 'Verify and sign in'} <ArrowRight size={18} />
      </button>
    </form>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
      <Link className="inline-flex items-center gap-2 font-extrabold text-emerald-700" to="/login" onClick={clearChallenge}><ArrowLeft size={17} /> Back to sign in</Link>
      <button type="button" onClick={resend} disabled={cooldown > 0 || busy} className="inline-flex items-center gap-2 font-extrabold text-emerald-700 disabled:cursor-not-allowed disabled:text-slate-400">
        <RefreshCw size={16} /> {cooldown > 0 ? 'Resend in ' + cooldown + 's' : 'Resend code'}
      </button>
    </div>
  </RecoveryShell>;
}
