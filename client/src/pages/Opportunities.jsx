// This page lists and filters current volunteer opportunities.
import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import OpportunityCard from '../components/OpportunityCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { districtsForProvince, OPPORTUNITY_PROVINCES } from '../data/nepalLocations.js';

const categories = ['', 'Education', 'Environment', 'Disaster Response', 'Fundraising', 'Social Work', 'Health', 'Community', 'Animal Welfare', 'Other'];
const fieldClass = 'h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

// Load, filter, sort, and display public opportunity records.
export default function Opportunities() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({ search: params.get('search') || '', category: params.get('category') || '', district: params.get('district') || '', province: params.get('province') || '', commitment: params.get('commitment') || '', organisation: params.get('organisation') || '' });
  const [sort, setSort] = useState('soonest');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // active prevents an old request from changing state after cleanup.
    let active = true;
    setLoading(true); setError('');
    // Wait briefly while typing so every key press does not call the API.
    const timer = setTimeout(() => {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      query.set('page', page);
      query.set('limit', '12');
      api(`/opportunities?${query}`).then((data) => {
        if (!active) return;
        // Replace page one, but append unique records when Load more is used.
        setItems((current) => page === 1 ? data.opportunities : [...current, ...data.opportunities.filter((item) => !current.some((existing) => existing._id === item._id))]);
        setPages(data.pages || 1);
        setTotal(data.total || 0);
      }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    }, filters.search ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [filters, page]);

  useEffect(() => {
    // Personal recommendations are available only to volunteer accounts.
    if (user?.role === 'volunteer') api('/opportunities/recommended').then((data) => setRecommended(data.opportunities)).catch(() => {});
  }, [user]);

  const displayedItems = useMemo(() => [...items].sort((a, b) => sort === 'newest' ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.date) - new Date(b.date)), [items, sort]);
  const hasFilters = Object.values(filters).some(Boolean);
  // Save filters in state and the URL so the search can be shared or refreshed.
  function commitFilters(next) { setPage(1); setFilters(next); setParams(Object.fromEntries(Object.entries(next).filter(([, item]) => item))); }
  // Update one filter without changing the other selected filters.
  function update(key, value) { commitFilters({ ...filters, [key]: value }); }
  // Clear the district because it may not belong to the newly selected province.
  function updateProvince(province) { commitFilters({ ...filters, province, district: '' }); }
  // Reset every filter and remove filter values from the URL.
  function clear() { const empty = { search: '', category: '', district: '', province: '', commitment: '', organisation: '' }; setFilters(empty); setParams({}); }

  return <main className="min-h-screen bg-[linear-gradient(180deg,#eaf2f0_0%,#f4f7f7_55%,#e9f3ef_100%)]">
    <section className="relative overflow-hidden border-b border-emerald-400/10 bg-[#071426] text-white">
      <div className="absolute -right-32 -top-48 size-[34rem] rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,rgba(52,211,153,.32)_1px,transparent_1px)] [background-size:30px_30px]" />
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-7">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-400">Opportunities across Nepal</p>
        <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><h1 className="text-4xl font-black tracking-[-.045em] text-white sm:text-5xl">Find work worth showing up for.</h1><p className="mt-3 max-w-3xl text-base text-slate-300">Search by category, skill, province, or district anywhere in Nepal. Your profile helps us put the most relevant roles first.</p></div>{user?.role === 'volunteer' && <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300"><Sparkles size={18} /> Personal matching is active</span>}</div>

        <div className="mt-9 grid gap-3 lg:grid-cols-[1.7fr_.7fr]">
          <label className="flex h-13 items-center gap-3 rounded-xl border border-white/10 bg-white px-4 text-slate-800 shadow-xl shadow-slate-950/15 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-400/10"><Search className="text-slate-400" size={20} /><input className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" value={filters.search} onChange={(e) => update('search', e.target.value)} placeholder="Search opportunity, skill, organisation, or city…" />{filters.search && <button onClick={() => update('search', '')}><X size={17} /></button>}</label>
          <select className={fieldClass} value={sort} onChange={(e) => setSort(e.target.value)}><option value="soonest">Sort by: Happening soon</option><option value="newest">Sort by: Recently added</option></select>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2"><span className="mr-2 flex items-center gap-1.5 text-xs font-extrabold text-slate-400"><SlidersHorizontal size={15} /> Category</span>{categories.map((category) => <button key={category || 'all'} onClick={() => update('category', category)} className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${filters.category === category ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-white/10 text-slate-200 hover:bg-white/15'}`}>{category || 'All categories'}</button>)}</div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4">
          <select aria-label="Province" className={fieldClass} value={filters.province} onChange={(e) => updateProvince(e.target.value)}><option value="">All provinces</option>{OPPORTUNITY_PROVINCES.map((item) => <option key={item} value={item}>{item === 'Nationwide' ? 'Nationwide / remote' : item}</option>)}</select>
          <select aria-label="District" className={fieldClass} value={filters.district} disabled={!filters.province} onChange={(e) => update('district', e.target.value)}><option value="">{filters.province ? 'All districts' : 'Select a province first'}</option>{districtsForProvince(filters.province).map((district) => <option key={district} value={district}>{district}</option>)}</select>
          <select className={fieldClass} value={filters.commitment} onChange={(e) => update('commitment', e.target.value)}><option value="">Any commitment</option><option>One-time</option><option>Short-term</option><option>Long-term</option><option>Flexible</option></select>
          <button className="h-12 rounded-xl border border-white/20 bg-transparent text-sm font-extrabold text-white transition hover:bg-white/10" onClick={clear}>Reset filters</button>
        </div>
      </div>
    </section>

    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-7">
      {recommended.length > 0 && !hasFilters && <section className="mb-16"><div className="mb-7 flex items-end justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-indigo-600">Selected for your profile</p><h2 className="mt-2 text-3xl font-black tracking-[-.035em]">Strong matches</h2></div><Sparkles className="text-indigo-500" /></div><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{recommended.slice(0, 3).map((item) => <OpportunityCard key={item._id} opportunity={item} ranked />)}</div></section>}

      <section><div className="mb-7 flex items-center justify-between"><h2 className="text-2xl font-black tracking-[-.03em]">Open opportunities</h2><span className="text-sm font-semibold text-slate-500">{total} found</span></div>
        {loading && page === 1 ? <div className="grid min-h-64 place-items-center"><span className="spinner" /></div> : error ? <div className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : displayedItems.length ? <><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{displayedItems.map((item) => <OpportunityCard key={item._id} opportunity={item} />)}</div>{page < pages && <div className="mt-10 flex justify-center"><button disabled={loading} className="rounded-xl bg-[#071426] px-6 py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60" onClick={() => setPage((current) => current + 1)}>{loading ? 'Loading opportunities...' : `Load more opportunities (${items.length} of ${total})`}</button></div>}</> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-20 text-center"><Search className="mx-auto text-emerald-600" size={38} /><h3 className="mt-4 text-xl font-extrabold">No opportunities match those filters.</h3><p className="mt-2 text-sm text-slate-500">Try a different province or broaden your search.</p><button className="mt-6 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white" onClick={clear}>Clear all filters</button></div>}
      </section>
    </div>
  </main>;
}
