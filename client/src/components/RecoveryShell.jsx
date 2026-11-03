// This component provides the shared password recovery layout.
import { HeartHandshake, KeyRound, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

// Reuse one layout for every password recovery step.
export default function RecoveryShell({ eyebrow, title, description, children }) {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.16),transparent_34%),linear-gradient(135deg,#e6f1ef_0%,#f5f8f7_48%,#e5efed_100%)] px-4 py-10 sm:px-6 sm:py-14">
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[#fbfdfc] shadow-2xl shadow-slate-900/10 lg:grid-cols-[.8fr_1.2fr]">
      <section className="relative hidden min-h-[620px] overflow-hidden bg-[#071426] p-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_center,rgba(52,211,153,.35)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="absolute -right-20 top-20 size-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <Link className="relative inline-flex items-center gap-3" to="/">
          <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/20"><HeartHandshake /></span>
          <span><strong className="block text-xl">Volunteer <b className="text-emerald-400">Nepal</b></strong><small className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">Community action network</small></span>
        </Link>
        <div className="relative my-auto">
          <span className="grid size-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><KeyRound size={28} /></span>
          <h2 className="mt-7 text-4xl font-black leading-tight tracking-[-.04em]">Secure account recovery.</h2>
          <p className="mt-5 text-sm leading-7 text-slate-300">A short-lived verification code keeps your Volunteer Nepal account protected while you choose a new password.</p>
        </div>
        <div className="relative flex items-center gap-3 border-t border-white/10 pt-7 text-xs text-slate-400"><ShieldCheck className="text-emerald-300" size={19} /> Codes expire after 10 minutes and work only once.</div>
      </section>

      <section className="grid min-h-[620px] place-items-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-600">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.045em] text-slate-950">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
          {children}
        </div>
      </section>
    </div>
  </main>;
}
