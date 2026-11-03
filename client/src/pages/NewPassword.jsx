// This page lets a user set a new password after verification.
import { useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import RecoveryShell from '../components/RecoveryShell.jsx';
import { api } from '../lib/api.js';

const inputClass = 'mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

// Collect and save a new password after OTP verification.
export default function NewPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || sessionStorage.getItem('password_reset_email') || '';
  const resetToken = sessionStorage.getItem('password_reset_token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Validate both password fields before sending the reset token.
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const data = await api('/auth/forgot-password/reset', {
        method: 'POST',
        body: { email, resetToken, password, confirmPassword }
      });
      sessionStorage.removeItem('password_reset_email');
      sessionStorage.removeItem('password_reset_token');
      navigate('/login', { replace: true, state: { success: data.message } });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!email || !resetToken) {
    return <RecoveryShell eyebrow="Password recovery" title="Reset session expired" description="Verify a new email code before choosing another password.">
      <Link className="mt-8 flex h-13 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white" to="/forgot-password">Request a new code <ArrowRight size={18} /></Link>
    </RecoveryShell>;
  }

  return <RecoveryShell eyebrow="Create a new password" title="Secure your account" description="Choose a new password with at least six characters. It will be securely hashed before it is stored.">
    <form className="mt-8 grid gap-5" onSubmit={submit}>
      <label className="text-sm font-bold text-slate-700">New password
        <span className="relative block">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-slate-400" size={18} />
          <input required minLength="6" autoComplete="new-password" type="password" className={inputClass + ' pl-11'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" />
        </span>
      </label>
      <label className="text-sm font-bold text-slate-700">Confirm new password
        <input required minLength="6" autoComplete="new-password" type="password" className={inputClass} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter the password again" />
      </label>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
      <button className="flex h-13 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/15 transition hover:bg-emerald-700 disabled:opacity-60" disabled={busy}>
        {busy ? 'Updating password…' : 'Reset password'} <ArrowRight size={18} />
      </button>
    </form>
    <Link className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700" to="/login"><ArrowLeft size={17} /> Back to sign in</Link>
  </RecoveryShell>;
}
