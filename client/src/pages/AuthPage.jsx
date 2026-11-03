// This page provides the login and registration forms.
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, HeartHandshake, MapPin, ShieldCheck, Sparkles, Target, UserRound, UsersRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { splitTags } from '../lib/api.js';
import { districtsForProvince, NEPAL_PROVINCES } from '../data/nepalLocations.js';

const inputClass = 'mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-100 disabled:text-slate-400';
const organisationTypes = ['NGO', 'Non-profit', 'Community group', 'Youth club', 'School or college', 'Social enterprise', 'Government or local body', 'Other'];
const emptyForm = {
  name: '', email: '', password: '', confirmPassword: '', province: '', district: '', location: '',
  phone: '', interests: '', skills: '', organisationName: '', organisationType: '', bio: '',
  registrationNumber: '', website: ''
};

// Manage both login and registration using the selected mode.
export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const [role, setRole] = useState('volunteer');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

  // Run either registration or login and move the user to the correct page.
  async function authenticate(credentials, registering = false) {
    // Disable the form while the login or registration request is running.
    setError(''); setBusy(true);
    try {
      if (registering) {
        await register(credentials);
        navigate('/dashboard', { replace: true });
        return;
      }

      const result = await login(credentials);
      if (result.requiresTwoFactor) {
        // Save the temporary challenge so the OTP page can finish login.
        const returnTo = location.state?.from?.pathname || '/dashboard';
        sessionStorage.setItem('two_factor_challenge', result.challengeToken);
        sessionStorage.setItem('two_factor_masked_email', result.maskedEmail || '');
        sessionStorage.setItem('two_factor_return_to', returnTo);
        navigate('/login/verify-2fa', { replace: true, state: { maskedEmail: result.maskedEmail } });
        return;
      }

      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  // Prepare the form values before passing them to authentication.
  async function submit(event) {
    event.preventDefault();
    // Login sends only two fields; registration sends the full profile.
    if (!isRegister) return authenticate({ email: form.email, password: form.password });
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    await authenticate({ ...form, role, interests: splitTags(form.interests), skills: splitTags(form.skills) }, true);
  }

  // Update the province and remove a district from the previous province.
  function updateProvince(province) {
    // Clear the old district because it may not belong to the new province.
    setForm({ ...form, province, district: '' });
  }

  // Sign in a sample account using the shared development password.
  const demoLogin = (email) => authenticate({ email, password: 'password123' });

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.12),transparent_32%),linear-gradient(135deg,#e9f2f0_0%,#f3f6f8_48%,#e5efed_100%)] px-4 py-10 sm:px-6 sm:py-14">
    <div className="mx-auto grid max-w-7xl items-start gap-5 lg:grid-cols-[.68fr_1.32fr]">
      <section className="relative hidden min-h-[720px] overflow-hidden rounded-[2rem] border border-emerald-400/10 bg-[#071426] p-10 text-white shadow-2xl shadow-slate-950/20 lg:sticky lg:top-24 lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_center,rgba(52,211,153,.35)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="absolute -right-24 top-24 size-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative"><Link className="inline-flex items-center gap-3" to="/"><span className="grid size-11 place-items-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/20"><HeartHandshake /></span><span><strong className="block text-xl">Volunteer <b className="text-emerald-400">Nepal</b></strong><small className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">Community action network</small></span></Link></div>
        <div className="relative mt-14"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300"><Sparkles size={15} /> Built for action across Nepal</span><h1 className="mt-6 text-4xl font-black leading-[1.06] tracking-[-.045em]">A better match starts with a clearer profile.</h1><p className="mt-5 text-sm leading-7 text-slate-300">Your location, interests, and skills help connect you with work where your time can matter most.</p></div>
        <div className="relative mt-8 grid gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4"><span className="grid size-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><MapPin size={19} /></span><div><strong className="block text-sm">Location-aware</strong><small className="text-xs text-slate-400">All 7 provinces and 77 districts</small></div></div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4"><span className="grid size-10 place-items-center rounded-xl bg-sky-400/10 text-sky-300"><Target size={19} /></span><div><strong className="block text-sm">Relevant opportunities</strong><small className="text-xs text-slate-400">Matched to interests and skills</small></div></div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4"><span className="grid size-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><UsersRound size={19} /></span><div><strong className="block text-sm">Trusted community</strong><small className="text-xs text-slate-400">Volunteers and verified partners</small></div></div>
        </div>
        <div className="relative mt-auto grid grid-cols-2 gap-3 border-t border-white/10 pt-7"><div><strong className="block text-2xl text-emerald-300">7</strong><small className="text-xs text-slate-400">Provinces covered</small></div><div><strong className="block text-2xl text-white">One profile</strong><small className="text-xs text-slate-400">A growing impact record</small></div></div>
      </section>

      <section className="grid place-items-center rounded-[2rem] border border-slate-200/80 bg-[#fbfdfc] p-6 shadow-2xl shadow-slate-900/10 sm:p-10 lg:p-14"><div className="w-full max-w-2xl">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-600">{isRegister ? 'Join the network' : 'Welcome back'}</p>
        <h2 className="mt-3 text-4xl font-black tracking-[-.045em] text-slate-950">{isRegister ? 'Create your Volunteer account.' : 'Sign in to continue.'}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">{isRegister ? 'Tell us where you are and what matters to you so your account is useful from day one.' : 'Your opportunities, applications, and activity history are waiting.'}</p>

        {isRegister && <div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${role === 'volunteer' ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => setRole('volunteer')}><span className="grid size-10 place-items-center rounded-xl bg-white text-emerald-600"><UserRound /></span><span><strong className="block text-sm">Volunteer</strong><small className="text-xs text-slate-500">Find ways to contribute</small></span></button><button type="button" className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${role === 'organisation' ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => setRole('organisation')}><span className="grid size-10 place-items-center rounded-xl bg-white text-emerald-600"><Building2 /></span><span><strong className="block text-sm">Organisation</strong><small className="text-xs text-slate-500">Mobilise volunteers</small></span></button></div>}

        {!isRegister && <div className="mt-7 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.1em] text-indigo-700"><Sparkles size={15} /> Demo accounts</div><div className="grid grid-cols-3 gap-2"><button disabled={busy} onClick={() => demoLogin('volunteer@volunterr.test')} className="rounded-xl border border-indigo-200 bg-white px-2 py-3 text-xs font-bold text-slate-700 hover:border-indigo-400"><UserRound className="mx-auto mb-1.5 text-emerald-600" size={18} />Volunteer</button><button disabled={busy} onClick={() => demoLogin('organisation@volunterr.test')} className="rounded-xl border border-indigo-200 bg-white px-2 py-3 text-xs font-bold text-slate-700 hover:border-indigo-400"><Building2 className="mx-auto mb-1.5 text-blue-600" size={18} />Organisation</button><button disabled={busy} onClick={() => demoLogin('admin@volunterr.test')} className="rounded-xl border border-indigo-200 bg-white px-2 py-3 text-xs font-bold text-slate-700 hover:border-indigo-400"><ShieldCheck className="mx-auto mb-1.5 text-violet-600" size={18} />Admin</button></div></div>}

        <form onSubmit={submit} className="mt-7 grid gap-5">
          {isRegister && <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">{role === 'organisation' ? 'Contact person name' : 'Full name'}<input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" /></label>
              {role === 'organisation' && <label className="text-sm font-bold text-slate-700">Organisation name<input required className={inputClass} value={form.organisationName} onChange={(e) => setForm({ ...form, organisationName: e.target.value })} placeholder="Organisation or community group" /></label>}
            </div>
            {role === 'organisation' && <label className="text-sm font-bold text-slate-700">Organisation type<select required className={inputClass} value={form.organisationType} onChange={(e) => setForm({ ...form, organisationType: e.target.value })}><option value="">Select organisation type</option>{organisationTypes.map((type) => <option key={type}>{type}</option>)}</select></label>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">Province<select required className={inputClass} value={form.province} onChange={(e) => updateProvince(e.target.value)}><option value="">Select province</option>{NEPAL_PROVINCES.map((province) => <option key={province}>{province}</option>)}</select></label>
              <label className="text-sm font-bold text-slate-700">District<select required disabled={!form.province} className={inputClass} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}><option value="">{form.province ? 'Select district' : 'Select province first'}</option>{districtsForProvince(form.province).map((district) => <option key={district}>{district}</option>)}</select></label>
            </div>
            <label className="text-sm font-bold text-slate-700">Municipality or local area<input required className={inputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Pokhara Metropolitan City" /></label>
            {role === 'volunteer' ? <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">Interests <small className="font-normal text-slate-400">(comma separated)</small><input required className={inputClass} value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="Environment, Education" /></label>
              <label className="text-sm font-bold text-slate-700">Skills <small className="font-normal text-slate-400">(comma separated)</small><input required className={inputClass} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Teaching, Photography" /></label>
            </div> : <>
              <label className="text-sm font-bold text-slate-700">Contact phone<input required className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +977 98XXXXXXXX" /></label>
              <label className="text-sm font-bold text-slate-700">Focus areas <small className="font-normal text-slate-400">(comma separated)</small><input required className={inputClass} value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="Education, Health, Environment" /></label>
              <label className="text-sm font-bold text-slate-700">About the organisation<textarea required rows="4" className={`${inputClass} h-auto py-3`} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Describe your mission and community work" /></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">Registration number <small className="font-normal text-slate-400">(optional)</small><input className={inputClass} value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} /></label><label className="text-sm font-bold text-slate-700">Website <small className="font-normal text-slate-400">(optional)</small><input type="url" className={inputClass} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.org" /></label></div>
            </>}
          </>}
          <label className="text-sm font-bold text-slate-700">Email address<input required type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
          <div className={`grid gap-4 ${isRegister ? 'sm:grid-cols-2' : ''}`}><label className="text-sm font-bold text-slate-700">Password<input required minLength="6" type="password" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" /></label>{isRegister && <label className="text-sm font-bold text-slate-700">Confirm password<input required minLength="6" type="password" className={inputClass} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Enter password again" /></label>}</div>
          {!isRegister && <div className="-mt-2 flex justify-end"><Link className="text-sm font-extrabold text-emerald-700 hover:text-emerald-800" to="/forgot-password">Forgot password?</Link></div>}
          {!isRegister && location.state?.success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{location.state.success}</div>}
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
          <button className="flex h-13 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/15 transition hover:bg-emerald-700 disabled:opacity-60" disabled={busy}>{busy ? 'Just a moment…' : isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={18} /></button>
        </form>
        <p className="mt-7 text-center text-sm text-slate-500">{isRegister ? 'Already part of Volunteer Nepal?' : 'New to Volunteer Nepal?'} <Link className="font-extrabold text-emerald-700" to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
      </div></section>
    </div>
  </main>;
}
