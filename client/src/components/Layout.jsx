// This component provides the shared navbar, footer, and page layout.
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowUpRight, HeartHandshake, LogOut, Menu, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Chatbot from './Chatbot.jsx';

const navItems = [
  ['/', 'Home'],
  ['/opportunities', 'Opportunities'],
  ['/organisations', 'Organisations'],
  ['/about', 'How it works']
];

// Display the shared navigation, page content, footer, and chatbot.
export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  // Change navigation colors when the current URL matches a link.
  const navClass = ({ isActive }) => `rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-emerald-400/15 text-emerald-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`;

  return (
    <div className="min-h-screen bg-[#edf3f2] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071426]/95 text-white shadow-lg shadow-slate-950/10 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-7">
          <Link className="group flex items-center gap-3" to="/" onClick={() => setOpen(false)}>
            <span className="grid size-11 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 transition group-hover:-rotate-3"><HeartHandshake size={24} /></span>
            <span className="leading-none"><strong className="block text-xl tracking-[-0.04em] text-white">Volunteer<span className="text-emerald-400"> Nepal</span></strong><small className="mt-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Community action network</small></span>
          </Link>

          <button className="grid size-10 place-items-center rounded-xl border border-white/15 text-slate-200 lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button>

          <nav className={`${open ? 'flex' : 'hidden'} absolute left-0 right-0 top-[76px] flex-col gap-2 border-b border-white/10 bg-[#071426] p-5 shadow-xl lg:static lg:flex lg:flex-row lg:items-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
            <div className="flex flex-col gap-1 lg:flex-row lg:items-center">
              {navItems.map(([to, label]) => <NavLink key={to} end={to === '/'} className={navClass} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}
            </div>
            <div className="my-2 h-px bg-white/10 lg:mx-2 lg:my-0 lg:h-7 lg:w-px" />
            {user ? (
              <>
                <NavLink className={navClass} to="/dashboard" onClick={() => setOpen(false)}>Dashboard</NavLink>
                <NavLink className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15" to={user.role === 'admin' ? '/dashboard/settings' : '/dashboard/profile'} onClick={() => setOpen(false)}><UserRound size={17} />{user.name.split(' ')[0]}</NavLink>
                <button className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 hover:bg-rose-400/10 hover:text-rose-300" onClick={() => { logout(); setOpen(false); }}><LogOut size={17} /> <span className="lg:hidden">Sign out</span></button>
              </>
            ) : (
              <>
                <Link className="rounded-xl px-3.5 py-2.5 text-center text-sm font-bold text-slate-200 hover:text-emerald-300" to="/login" onClick={() => setOpen(false)}>Sign in</Link>
                <Link className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/15 transition hover:-translate-y-0.5 hover:bg-emerald-400" to="/register" onClick={() => setOpen(false)}>Join Volunteer <ArrowUpRight size={16} /></Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="bg-[#071426] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-7 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.15fr]">
          <div>
            <Link className="flex items-center gap-3 text-white" to="/"><span className="grid size-11 place-items-center rounded-2xl bg-emerald-500"><HeartHandshake /></span><span><strong className="block text-xl">Volunteer <b className="text-emerald-400">Nepal</b></strong><small className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Give time. Grow community.</small></span></Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">A trusted place for people and community organisations across Nepal to discover one another and create measurable local impact.</p>
            <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">Smart matching</span><span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold text-sky-300">Verified partners</span></div>
          </div>
          <div><h4 className="mb-5 text-xs font-extrabold uppercase tracking-[0.16em] text-white">Explore</h4><div className="grid gap-3 text-sm text-slate-400"><Link className="hover:text-emerald-300" to="/opportunities">Find opportunities</Link><Link className="hover:text-emerald-300" to="/organisations">Organisations</Link><Link className="hover:text-emerald-300" to="/about">How it works</Link></div></div>
          <div><h4 className="mb-5 text-xs font-extrabold uppercase tracking-[0.16em] text-white">Get involved</h4><div className="grid gap-3 text-sm text-slate-400"><Link className="hover:text-emerald-300" to="/register">Join as volunteer</Link><Link className="hover:text-emerald-300" to="/register">Register an organisation</Link><Link className="hover:text-emerald-300" to="/login">Account sign in</Link></div></div>
          <div><h4 className="mb-5 text-xs font-extrabold uppercase tracking-[0.16em] text-white">Nepal-wide</h4><div className="grid gap-3 text-sm leading-6 text-slate-400"><p>Serving communities across all seven provinces.</p><p>hello@volunteernepal.org</p><p>Kathmandu, Nepal</p></div></div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-white/10 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between sm:px-7"><span>© {new Date().getFullYear()} Volunteer Nepal</span><span>Designed for community, built with care.</span></div>
      </footer>
      <Chatbot />
    </div>
  );
}
