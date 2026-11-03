// This component displays a summary of one volunteer opportunity.
import { ArrowUpRight, BadgeCheck, BookOpen, CalendarDays, HandCoins, HeartPulse, HeartHandshake, Leaf, MapPin, PawPrint, ShieldAlert, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../lib/api.js';

const visuals = {
  Environment: { icon: Leaf, gradient: 'from-emerald-900 via-emerald-700 to-teal-400', accent: 'bg-emerald-400' },
  Education: { icon: BookOpen, gradient: 'from-blue-950 via-indigo-700 to-sky-400', accent: 'bg-sky-400' },
  Health: { icon: HeartPulse, gradient: 'from-rose-950 via-rose-700 to-orange-300', accent: 'bg-rose-400' },
  'Disaster Response': { icon: ShieldAlert, gradient: 'from-orange-950 via-orange-700 to-amber-300', accent: 'bg-amber-400' },
  Fundraising: { icon: HandCoins, gradient: 'from-amber-950 via-yellow-700 to-lime-300', accent: 'bg-yellow-400' },
  'Social Work': { icon: HeartHandshake, gradient: 'from-fuchsia-950 via-purple-700 to-pink-300', accent: 'bg-fuchsia-400' },
  Community: { icon: UsersRound, gradient: 'from-violet-950 via-violet-700 to-fuchsia-300', accent: 'bg-violet-400' },
  'Animal Welfare': { icon: PawPrint, gradient: 'from-teal-950 via-cyan-700 to-lime-300', accent: 'bg-teal-400' },
  Other: { icon: Sparkles, gradient: 'from-slate-900 via-slate-700 to-slate-400', accent: 'bg-slate-400' }
};

// Present the most useful opportunity details in a clickable card.
export default function OpportunityCard({ opportunity, ranked = false }) {
  const org = opportunity.organisation?.organisationName || opportunity.organisation?.name || 'Community organisation';
  const visual = visuals[opportunity.category] || visuals.Other;
  const VisualIcon = visual.icon;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-[#fbfdfc] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10">
      <div className={`relative h-48 overflow-hidden bg-gradient-to-br ${visual.gradient}`}>
        {opportunity.image ? <>
          <img className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" src={opportunity.image} alt={`Cover for ${opportunity.title}`} loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/5 to-slate-900/15" />
        </> : <>
          <div className="absolute -right-12 -top-12 size-44 rounded-full border-[28px] border-white/10" />
          <div className="absolute -bottom-20 -left-14 size-52 rounded-full bg-white/10 blur-sm" />
          <VisualIcon className="absolute bottom-5 right-6 size-24 stroke-[1.15] text-white/25 transition duration-300 group-hover:rotate-6 group-hover:scale-110" />
        </>}
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-slate-800 shadow-sm">{opportunity.category}</span>
        {ranked && <span className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-indigo-600 shadow-md"><Sparkles size={14} /> {opportunity.matchScore}% match</span>}
      </div>
      <div className="p-5">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-emerald-700">{org}{opportunity.organisation?.verified && <BadgeCheck size={14} className="fill-emerald-100" />}</div>
        <h3 className="min-h-14 text-xl font-extrabold leading-7 tracking-[-0.025em] text-slate-950">{opportunity.title}</h3>
        <p className="mt-2 line-clamp-2 min-h-11 text-sm leading-6 text-slate-500">{opportunity.summary || opportunity.description?.slice(0, 130)}</p>
        <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-2"><MapPin size={15} className="text-emerald-600" />{opportunity.remote ? 'Remote · ' : ''}{[opportunity.location, opportunity.district !== opportunity.location ? opportunity.district : '', opportunity.province !== 'Nationwide' ? opportunity.province : ''].filter(Boolean).join(', ') || 'Nationwide'}</span>
          <span className="flex items-center gap-2"><CalendarDays size={15} className="text-emerald-600" />{formatDate(opportunity.date)}</span>
        </div>
        {ranked && opportunity.matchReasons?.[0] && <p className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700"><Sparkles size={14} />{opportunity.matchReasons.slice(0, 3).join(' · ')}</p>}
        <Link className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-extrabold text-slate-900 transition group-hover:text-emerald-700" to={`/opportunities/${opportunity._id}`}>View opportunity <ArrowUpRight size={18} /></Link>
      </div>
    </article>
  );
}
