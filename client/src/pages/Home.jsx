// This page displays the main Volunteer Nepal landing page.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BookOpen, Building2, HeartPulse, Leaf, MapPin, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { api } from '../lib/api.js';
import OpportunityCard from '../components/OpportunityCard.jsx';

const categories = [
  { name: 'Environment', icon: Leaf, text: 'Restore forests, rivers, and neighbourhoods', tone: 'bg-emerald-50 text-emerald-700' },
  { name: 'Education', icon: BookOpen, text: 'Help learners build confidence and possibility', tone: 'bg-sky-50 text-sky-700' },
  { name: 'Health', icon: HeartPulse, text: 'Strengthen community health and wellbeing', tone: 'bg-rose-50 text-rose-700' },
  { name: 'Community', icon: UsersRound, text: 'Show up for the people closest to home', tone: 'bg-violet-50 text-violet-700' }
];

// Render the public landing page and main platform features.
export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [stats, setStats] = useState({ hours: 0, organisations: 0, opportunities: 0 });
  useEffect(() => {
    Promise.all([api('/opportunities?featured=true&limit=3'), api('/organisations/stats')])
      .then(([opportunities, overview]) => { setFeatured(opportunities.opportunities); setStats(overview); })
      .catch(() => {});
  }, []);

  return <main>
    <section className="relative isolate overflow-hidden bg-[#071426] text-white">
      <div className="absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(circle_at_center,rgba(52,211,153,.22)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute -left-32 top-20 -z-10 size-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="mx-auto grid min-h-[690px] max-w-7xl items-center gap-14 px-5 py-20 sm:px-7 lg:grid-cols-[1.02fr_.98fr] lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-extrabold text-emerald-300"><Sparkles size={15} /> Nepal’s community opportunity network</span>
          <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Find your place.<br /><span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">Move Nepal forward.</span></h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">Discover trusted opportunities shaped around your skills, interests, and location, and turn a few free hours into visible community progress.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-extrabold text-[#071426] shadow-xl shadow-emerald-500/15 transition hover:-translate-y-0.5 hover:bg-emerald-400" to="/opportunities">Explore opportunities <ArrowRight size={19} /></Link><Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/70 px-6 text-sm font-extrabold text-white transition hover:border-slate-400 hover:bg-slate-800" to="/register"><UsersRound size={18} /> Join the community</Link></div>
          <div className="mt-8 flex max-w-xl items-center justify-between gap-4 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-indigo-500 text-white"><Sparkles size={18} /></span><span><strong className="block text-sm">Not sure where to begin?</strong><small className="text-xs text-indigo-200">Ask our volunteer guide for a starting point.</small></span></div><button className="hidden rounded-lg bg-indigo-500 px-4 py-2 text-xs font-extrabold sm:block" onClick={() => document.querySelector('.chat-trigger')?.click()}>Ask the guide</button></div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-4 rounded-[2.25rem] bg-gradient-to-br from-emerald-400/25 to-cyan-400/5 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-slate-900 shadow-2xl">
            <img src="/images/nepal-volunteers-hero.png" alt="Young volunteers planting trees in Nepal's hills" className="h-[470px] w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 divide-x divide-white/15 rounded-2xl border border-white/15 bg-[#071426]/90 p-4 backdrop-blur-xl">
              <div className="px-2"><strong className="block text-lg font-black text-emerald-300">{stats.hours}+</strong><small className="text-[10px] text-slate-400">hours recorded</small></div>
              <div className="px-4"><strong className="block text-lg font-black text-white">{stats.organisations}+</strong><small className="text-[10px] text-slate-400">organisations</small></div>
              <div className="px-4"><strong className="block text-lg font-black text-cyan-300">{stats.opportunities}</strong><small className="text-[10px] text-slate-400">open roles</small></div>
            </div>
          </div>
          <div className="absolute -right-3 -top-4 hidden items-center gap-2 rounded-xl bg-white px-4 py-3 text-slate-900 shadow-xl sm:flex"><ShieldCheck className="text-emerald-600" size={20} /><span className="text-xs font-extrabold">Community-first<br />and transparent</span></div>
        </div>
      </div>
    </section>

    <section className="bg-[#f3f7f5] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-7">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-600">Choose a cause</p><h2 className="mt-3 text-4xl font-black tracking-[-.045em] text-slate-950 sm:text-5xl">What matters to you?</h2></div><p className="max-w-md text-sm leading-7 text-slate-500">Start with a cause you care about. We’ll help you find practical work that fits your time and strengths.</p></div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{categories.map(({ name, icon: Icon, text, tone }) => <Link key={name} to={`/opportunities?category=${encodeURIComponent(name)}`} className="group rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:bg-white hover:shadow-lg"><span className={`grid size-12 place-items-center rounded-xl ${tone}`}><Icon /></span><h3 className="mt-7 text-lg font-extrabold text-slate-950">{name}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p><ArrowUpRight className="mt-5 text-slate-300 transition group-hover:text-emerald-600" /></Link>)}</div>
      </div>
    </section>

    <section className="bg-[#e5efec] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-7">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-indigo-600">Happening across Nepal</p><h2 className="mt-3 text-4xl font-black tracking-[-.045em] text-slate-950 sm:text-5xl">Ready when you are.</h2></div><Link className="inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700" to="/opportunities">View every opportunity <ArrowRight size={18} /></Link></div>
        {featured.length ? <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{featured.map((item) => <OpportunityCard key={item._id} opportunity={item} />)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"><MapPin className="mx-auto text-emerald-600" /><h3 className="mt-4 text-xl font-extrabold">Fresh opportunities are being prepared.</h3><p className="mt-2 text-sm text-slate-500">Run the sample-data command to populate the platform.</p></div>}
      </div>
    </section>

    <section className="bg-[#071426] py-20 text-white sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-7 lg:grid-cols-[.8fr_1.2fr]">
        <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-400">A clear path to action</p><h2 className="mt-3 text-4xl font-black leading-tight tracking-[-.045em] text-white sm:text-5xl">Less searching.<br />More showing up.</h2><p className="mt-5 max-w-md text-sm leading-7 text-slate-300">Volunteer Nepal keeps discovery, applications, attendance, and your contribution history together.</p></div>
        <div className="grid gap-4 sm:grid-cols-3">{[
          ['01', 'Build your profile', 'Share your skills, interests, and part of Nepal.'],
          ['02', 'Discover your fit', 'Browse freely or follow personalised recommendations.'],
          ['03', 'Create real impact', 'Apply, attend, and keep a record of every hour.']
        ].map(([number, title, text]) => <div key={number} className="rounded-2xl border border-white/10 bg-white/[.06] p-6 text-white"><span className="text-xs font-black text-emerald-400">{number}</span><h3 className="mt-12 text-lg font-extrabold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{text}</p></div>)}</div>
      </div>
    </section>

    <section className="bg-emerald-600 py-16"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 sm:px-7 lg:flex-row lg:items-center"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-100">Every province. Every kind of contribution.</p><h2 className="mt-3 text-4xl font-black tracking-[-.045em] text-white">Bring what you have. Start where you are.</h2></div><Link className="inline-flex min-h-14 items-center gap-2 rounded-xl bg-white px-7 text-sm font-extrabold text-emerald-700 shadow-xl" to="/register">Join Volunteer Nepal <ArrowRight size={18} /></Link></div></section>
  </main>;
}
