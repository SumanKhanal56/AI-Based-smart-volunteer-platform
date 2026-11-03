// This page verifies the password reset code.
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import RecoveryShell from '../components/RecoveryShell.jsx';
import { api } from '../lib/api.js';

const inputClass = 'mt-2 h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-xl font-extrabold tracking-[.45em] outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

// Verify the password reset OTP and receive a temporary reset token.
export default function VerifyResetOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || sessionStorage.getItem('password_reset_email') || '';
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // Send the entered OTP and continue only when the backend accepts it.
  async function verify(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/forgot-password/verify', { method: 'POST', body: { email, otp } });
      sessionStorage.setItem('password_reset_email', email);
      sessionStorage.setItem('password_reset_token', data.resetToken);
      navigate('/forgot-password/new', { state: { email } });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  // Ask the backend to email a fresh OTP after the cooldown.
  async function resend() {
    if (cooldown > 0 || busy) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const data = await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setOtp('');
      setMessage(data.message);
      setCooldown(60);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!email) {
    return <RecoveryShell eyebrow="Password recovery" title="Start with your email" description="Your recovery session is missing. Request a new code to continue.">
      <Link className="mt-8 flex h-13 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white" to="/forgot-password">Request a reset code <ArrowRight size={18} /></Link>
    </RecoveryShell>;
  }

  return <RecoveryShell eyebrow="Verify your email" title="Enter the six-digit code" description="Check your registered email for a code. It expires after 10 minutes and can only be used once.">
    {message && <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-800">{message}</div>}
    <form className="mt-7 grid gap-5" onSubmit={verify}>
      <label className="text-sm font-bold text-slate-700">Verification code
        <input required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" className={inputClass} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" />
      </label>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
      <button className="flex h-13 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/15 transition hover:bg-emerald-700 disabled:opacity-60" disabled={busy || otp.length !== 6}>
        {busy ? 'Verifying…' : 'Verify code'} <ArrowRight size={18} />
      </button>
    </form>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
      <Link className="inline-flex items-center gap-2 font-extrabold text-emerald-700" to="/forgot-password"><ArrowLeft size={17} /> Change email</Link>
      <button type="button" onClick={resend} disabled={cooldown > 0 || busy} className="inline-flex items-center gap-2 font-extrabold text-emerald-700 disabled:cursor-not-allowed disabled:text-slate-400">
        <RefreshCw size={16} /> {cooldown > 0 ? 'Resend in ' + cooldown + 's' : 'Resend code'}
      </button>
    </div>
  </RecoveryShell>;
}
