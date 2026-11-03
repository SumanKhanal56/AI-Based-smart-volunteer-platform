// This page lists registered volunteer organizations.
import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Building2, MapPin, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { districtsForProvince, NEPAL_PROVINCES } from '../data/nepalLocations.js';

const organisationArtwork = [
  { name: /green steps/i, src: '/images/organisations/green-steps-nepal.png' },
  { name: /himalayan community action/i, src: '/images/organisations/himalayan-community-action.png' },
  { name: /nepal genz youth club/i, src: '/images/organisations/nepal-genz-youth-club.png' }
];

// Choose the first available organization logo or generated image.
function pictureFor(item, name) {
  return item.avatar || organisationArtwork.find((artwork) => artwork.name.test(name))?.src || '';
}

// Create short initials when an image is unavailable.
function initialsFor(name) {
  return name.split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join('').toUpperCase();
}

// Search and display registered organization profiles.
export default function Organisations() {
  const [organisations, setOrganisations] = useState([]);
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (province) query.set('province', province);
    if (district) query.set('district', district);
    if (verifiedOnly) query.set('verified', 'true');
    api(`/organisations?${query}`).then((data) => setOrganisations(data.organisations)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [search, province, district, verifiedOnly]);

  // Reset the district when the province filter changes.
  function updateProvince(value) {
    setProvince(value);
    setDistrict('');
  }

  return <main className="min-h-screen bg-[linear-gradient(180deg,#eaf2f0_0%,#f5f8f7_55%,#e8f2ee_100%)]">
    <section className="relative overflow-hidden border-b border-emerald-400/10 bg-[#071426] text-white">
      <div className="absolute -left-32 -top-52 size-[34rem] rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,rgba(52,211,153,.32)_1px,transparent_1px)] [background-size:30px_30px]" />
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-7">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-400">People organising change</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-.045em] text-white sm:text-5xl">Community organisations</h1>
        <p className="mt-3 max-w-3xl text-base text-slate-300">Meet registered NGOs, youth groups, and local initiatives creating ways to contribute across Nepal.</p>
        <div className="mt-9 grid gap-3 lg:grid-cols-[1.4fr_.55fr_.55fr_.5fr]">
          <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10"><Search className="text-slate-400" size={19} /><input className="h-full flex-1 bg-transparent text-sm outline-none" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by organisation name or cause…" /></label>
          <select className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none" value={province} onChange={(e) => updateProvince(e.target.value)}><option value="">All provinces</option>{NEPAL_PROVINCES.map((item) => <option key={item}>{item}</option>)}</select>
          <select disabled={!province} className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none disabled:bg-slate-100" value={district} onChange={(e) => setDistrict(e.target.value)}><option value="">{province ? 'All districts' : 'Select province first'}</option>{districtsForProvince(province).map((item) => <option key={item}>{item}</option>)}</select>
          <button className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold transition ${verifiedOnly ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-white/20 bg-white/10 text-white hover:bg-white/15'}`} onClick={() => setVerifiedOnly(!verifiedOnly)}><ShieldCheck size={17} /> Verified only</button>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-7">
      <div className="mb-7 flex items-center justify-between"><h2 className="text-2xl font-black tracking-[-.03em]">Partners on Volunteer Nepal</h2><span className="text-sm font-semibold text-slate-500">{organisations.length} organisations</span></div>
      {loading ? <div className="grid min-h-64 place-items-center"><span className="spinner" /></div> : error ? <div className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : organisations.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{organisations.map((item) => {
        const name = item.organisationName || item.name;
        const picture = pictureFor(item, name);
        return <article key={item._id} className="flex min-h-72 flex-col rounded-2xl border border-slate-200/80 bg-[#fbfdfc] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
          <div className="flex items-start justify-between gap-4">{picture
            ? <img className="size-16 rounded-2xl border border-emerald-100 bg-[#071426] object-cover shadow-lg shadow-emerald-600/15" src={picture} alt={`${name} emblem`} loading="lazy" />
            : <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-800 text-xl font-black text-white shadow-lg shadow-red-600/20">{initialsFor(name)}</span>}{item.verified && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700"><BadgeCheck size={14} /> Verified partner</span>}</div>
          <h3 className="mt-6 text-xl font-extrabold tracking-[-.025em] text-slate-950">{name}</h3>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400"><MapPin size={14} />{[item.location, item.district, item.province].filter(Boolean).join(', ') || 'Nepal'}</p>
          <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-600">{item.bio || 'A community organisation creating practical ways for volunteers to contribute.'}</p>
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5"><span className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><Building2 size={15} /> {item.opportunityCount} open {item.opportunityCount === 1 ? 'role' : 'roles'}</span><Link to={`/opportunities?organisation=${item._id}`} className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-700">View roles <ArrowRight size={16} /></Link></div>
        </article>;
      })}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-20 text-center"><Building2 className="mx-auto text-emerald-600" /><h3 className="mt-4 text-xl font-extrabold">No organisations match that search.</h3></div>}
    </section>
  </main>;
}
