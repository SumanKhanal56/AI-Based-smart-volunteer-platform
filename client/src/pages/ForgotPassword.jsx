// This page starts password recovery using a registered email.
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import RecoveryShell from '../components/RecoveryShell.jsx';
import { api } from '../lib/api.js';

const inputClass = 'mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

// Collect the registered email and request a password reset OTP.
// Collect the registered email and request a password reset OTP.
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // Send the email to the backend and continue to OTP verification.
  // Send the email to the backend and continue to OTP verification.
  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/forgot-password', { method: 'POST', body: { email } });
      const normalizedEmail = email.trim().toLowerCase();
      sessionStorage.setItem('password_reset_email', normalizedEmail);
      sessionStorage.removeItem('password_reset_token');
      navigate('/forgot-password/verify', {
        state: { email: normalizedEmail, message: data.message }
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return <RecoveryShell eyebrow="Password recovery" title="Forgot your password?" description="Enter your registered email address. If an account exists, we will send a six-digit verification code.">
    <form className="mt-8 grid gap-5" onSubmit={submit}>
      <label className="text-sm font-bold text-slate-700">Registered email address
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-slate-400" size={18} />
          <input required autoComplete="email" type="email" className={inputClass + ' pl-11'} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </span>
      </label>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
      <button className="flex h-13 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/15 transition hover:bg-emerald-700 disabled:opacity-60" disabled={busy}>
        {busy ? 'Sending securely…' : 'Send reset code'} <ArrowRight size={18} />
      </button>
    </form>
    <Link className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700" to="/login"><ArrowLeft size={17} /> Back to sign in</Link>
  </RecoveryShell>;
}
