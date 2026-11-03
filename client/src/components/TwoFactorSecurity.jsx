// This component lets users manage optional two-factor authentication.
import { useEffect, useState } from 'react';
import { KeyRound, LockKeyhole, RefreshCw, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

// Manage enabling, verifying, and disabling two-factor authentication.
export default function TwoFactorSecurity() {
  const { user, refreshUser } = useAuth();
  const [mode, setMode] = useState('idle');
  const [otp, setOtp] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    // Reduce the resend timer once per second until it reaches zero.
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // Request the OTP needed to enable two-factor authentication.
  async function requestEnableCode() {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      // Ask the backend to create and email a new setup OTP.
      const data = await api('/auth/2fa/enable/request', { method: 'POST' });
      setMaskedEmail(data.maskedEmail || 'your registered email');
      setMessage(data.message);
      setOtp('');
      setMode('enable');
      setCooldown(60);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  // Verify the OTP and update the account security state.
  async function verifyEnable(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      // Send the entered OTP, then reload the user to show 2FA as enabled.
      const data = await api('/auth/2fa/enable/verify', { method: 'POST', body: { otp } });
      await refreshUser();
      setMode('idle');
      setOtp('');
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  // Confirm the password and disable two-factor authentication.
  async function disableTwoFactor(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      // The current password confirms that the real account owner requested this.
      const data = await api('/auth/2fa/disable', {
        method: 'POST',
        body: { currentPassword }
      });
      await refreshUser();
      setMode('idle');
      setCurrentPassword('');
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  // Return the security panel to its normal state and clear form values.
  function cancel() {
    setMode('idle');
    setOtp('');
    setCurrentPassword('');
    setError('');
  }

  return <section className="container dashboard-section pb-4">
    <div className="section-heading compact">
      <p className="eyebrow">Account security</p>
      <h2>Two-factor authentication</h2>
    </div>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#071426] text-emerald-300">
          {user.twoFactorEnabled ? <ShieldCheck size={28} /> : <ShieldOff size={28} />}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-black text-slate-950">Email verification at sign in</h3>
            <span className={user.twoFactorEnabled ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800' : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600'}>
              {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Add an extra layer of security. When enabled, signing in requires your password and a six-digit code sent to your registered email.</p>
        </div>
        {mode === 'idle' && (user.twoFactorEnabled
          ? <button type="button" onClick={() => { setMode('disable'); setError(''); setMessage(''); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 text-sm font-extrabold text-rose-700 hover:bg-rose-100"><LockKeyhole size={17} /> Disable 2FA</button>
          : <button type="button" onClick={requestEnableCode} disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"><KeyRound size={17} /> {busy ? 'Sending…' : 'Enable 2FA'}</button>)}
      </div>

      {(mode !== 'idle' || message || error) && <div className="border-t border-slate-200 bg-slate-50/80 p-6 sm:p-8">
        {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}

        {mode === 'enable' && <form className="grid max-w-lg gap-4" onSubmit={verifyEnable}>
          <p className="text-sm leading-6 text-slate-600">Enter the code sent to <strong>{maskedEmail}</strong>. It expires in five minutes.</p>
          <input required autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" className={inputClass + ' text-center text-lg font-extrabold tracking-[.35em]'} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" />
          <div className="flex flex-wrap gap-3">
            <button className="button primary" disabled={busy || otp.length !== 6}>{busy ? 'Verifying…' : 'Verify and enable'}</button>
            <button type="button" className="button secondary" onClick={requestEnableCode} disabled={busy || cooldown > 0}><RefreshCw size={16} /> {cooldown > 0 ? 'Resend in ' + cooldown + 's' : 'Resend code'}</button>
            <button type="button" className="button secondary" onClick={cancel}>Cancel</button>
          </div>
        </form>}

        {mode === 'disable' && <form className="grid max-w-lg gap-4" onSubmit={disableTwoFactor}>
          <p className="text-sm leading-6 text-slate-600">Enter your current password to confirm that you want to disable two-factor authentication.</p>
          <input required autoFocus autoComplete="current-password" type="password" className={inputClass} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" />
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-rose-700 disabled:opacity-60" disabled={busy}>{busy ? 'Checking…' : 'Confirm disable'}</button>
            <button type="button" className="button secondary" onClick={cancel}>Cancel</button>
          </div>
        </form>}
      </div>}
    </div>
  </section>;
}
