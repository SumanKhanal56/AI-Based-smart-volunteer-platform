// This page selects the correct dashboard for each account role.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText, Pencil, Plus, Sparkles, UsersRound, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, formatDate, splitTags } from '../lib/api.js';
import OpportunityCard from '../components/OpportunityCard.jsx';
import TwoFactorSecurity from '../components/TwoFactorSecurity.jsx';
import VolunteerPortal from '../components/VolunteerPortal.jsx';
import OrganizationPortal from '../components/OrganizationPortal.jsx';
import AdminPortal from '../components/AdminPortal.jsx';
import { districtsForProvince, OPPORTUNITY_PROVINCES } from '../data/nepalLocations.js';

// Select the correct dashboard component for the logged-in role.
export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'organisation') return <OrganizationPortal user={user} />;
  if (user.role === 'admin') return <AdminPortal user={user} />;
  return <VolunteerPortal user={user} />;
}

// Reuse the older dashboard heading layout.
function DashboardTop({ eyebrow, title, text, action }) {
  return <div className="container dashboard-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>{action}</div>;
}

// Display one dashboard statistic.
function Stat({ icon: Icon, value, label, tone = '' }) {
  return <div className={`stat-card ${tone}`}><span><Icon /></span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

// Load and display volunteer applications and recommendations.
function VolunteerDashboard({ user }) {
  const [applications, setApplications] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [error, setError] = useState('');
  // Request both volunteer datasets together.
  const load = () => Promise.all([api('/applications/mine/list'), api('/opportunities/recommended')]).then(([a, r]) => { setApplications(a.applications); setRecommended(r.opportunities); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const hours = applications.reduce((sum, item) => sum + (item.attendance === 'present' ? item.hours : 0), 0);
  const completed = applications.filter((item) => item.attendance === 'present').length;
  // Withdraw one application and reload the table.
  async function withdraw(id) { try { await api(`/applications/${id}/withdraw`, { method: 'PATCH' }); load(); } catch (e) { setError(e.message); } }

  return <main className="dashboard-page"><DashboardTop eyebrow="Volunteer dashboard" title={`Namaste, ${user.name.split(' ')[0]}.`} text="Here’s the good you’re part of—and what you could do next." action={<Link className="button primary" to="/opportunities">Find opportunities <ArrowRight /></Link>} />
    <div className="container stats-grid"><Stat icon={FileText} value={applications.length} label="Applications" /><Stat icon={CheckCircle2} value={completed} label="Activities completed" tone="mint" /><Stat icon={Clock3} value={hours} label="Hours contributed" tone="gold" /></div>
    {error && <div className="container alert error">{error}</div>}
    <section className="container dashboard-section"><div className="section-heading split compact"><div><p className="eyebrow">Made for you</p><h2>Your smart matches</h2></div><Link className="text-link dark" to="/opportunities">See every opportunity <ArrowRight /></Link></div>{recommended.length ? <div className="opportunity-grid">{recommended.slice(0, 3).map((item) => <OpportunityCard key={item._id} opportunity={item} ranked />)}</div> : <div className="panel empty-inline"><Sparkles /><div><h3>Your matches are taking shape.</h3><p>Add interests, skills, and a location to your profile.</p></div><Link className="button secondary" to="/profile">Complete profile</Link></div>}</section>
    <section className="container dashboard-section"><div className="section-heading compact"><p className="eyebrow">Your journey</p><h2>Applications & history</h2></div><div className="panel table-wrap">{applications.length ? <table><thead><tr><th>Opportunity</th><th>Date</th><th>Status</th><th>Attendance</th><th /></tr></thead><tbody>{applications.map((item) => <tr key={item._id}><td><Link to={`/opportunities/${item.opportunity?._id}`}><strong>{item.opportunity?.title || 'Closed opportunity'}</strong><small>{item.opportunity?.organisation?.organisationName || item.opportunity?.organisation?.name}</small></Link></td><td>{formatDate(item.opportunity?.date)}</td><td><Status value={item.status} /></td><td>{item.attendance === 'present' ? `${item.hours} hours` : item.attendance.replace('-', ' ')}</td><td>{['pending', 'accepted'].includes(item.status) && <button className="table-action" onClick={() => withdraw(item._id)}>Withdraw</button>}</td></tr>)}</tbody></table> : <div className="empty-state small"><FileText /><h3>No applications yet</h3><p>Your volunteer story can start today.</p><Link className="button primary" to="/opportunities">Browse opportunities</Link></div>}</div></section>
    <TwoFactorSecurity />
  </main>;
}

// Display a colored status label.
function Status({ value }) { return <span className={`status status-${value}`}>{value}</span>; }

const blankOpportunity = { title: '', description: '', summary: '', category: 'Community', location: '', district: '', province: '', remote: false, date: '', endDate: '', deadline: '', duration: '', commitment: 'One-time', requiredSkills: '', interests: '', capacity: 20, image: '', status: 'published', featured: false };

// Load and manage organization opportunities and applications.
function OrganisationDashboard({ user }) {
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(blankOpportunity);
  const [editingId, setEditingId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [attendance, setAttendance] = useState({});
  // Request both organization datasets together.
  const load = () => Promise.all([api('/opportunities/mine'), api('/applications/manage/list')]).then(([o, a]) => { setOpportunities(o.opportunities); setApplications(a.applications); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const accepted = applications.filter((item) => item.status === 'accepted').length;
  const pending = applications.filter((item) => item.status === 'pending').length;

  // Convert a saved date into the value expected by a date input.
  function inputDate(value) {
    return value ? new Date(value).toISOString().slice(0, 10) : '';
  }

  // Reset and open the form for a new opportunity.
  function openCreate() {
    setEditingId('');
    setForm(blankOpportunity);
    setError('');
    setNotice('');
    setShowForm(true);
  }

  // Copy an existing opportunity into the edit form.
  function openEdit(item) {
    setEditingId(item._id);
    setForm({
      ...blankOpportunity,
      ...item,
      summary: '',
      date: inputDate(item.date),
      endDate: inputDate(item.endDate),
      deadline: inputDate(item.deadline),
      requiredSkills: item.requiredSkills?.join(', ') || '',
      interests: item.interests?.join(', ') || ''
    });
    setError('');
    setNotice('');
    setShowForm(true);
  }

  // Close the form and clear its temporary values.
  function closeForm() {
    setShowForm(false);
    setEditingId('');
    setForm(blankOpportunity);
  }

  // Create or update an opportunity using the current form values.
  async function saveOpportunity(event) {
    event.preventDefault();
    if (form.deadline && form.date && form.deadline >= form.date) {
      setError('The application deadline must be before the activity date.');
      return;
    }
    if (form.endDate && form.date && form.endDate < form.date) {
      setError('The end date cannot be before the activity date.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    const body = {
      ...form,
      requiredSkills: splitTags(form.requiredSkills),
      interests: splitTags(form.interests),
      capacity: Number(form.capacity),
      endDate: form.endDate || null,
      deadline: form.deadline || null
    };
    try {
      await api(editingId ? `/opportunities/${editingId}` : '/opportunities', { method: editingId ? 'PATCH' : 'POST', body });
      const message = editingId ? 'Opportunity updated successfully.' : form.status === 'draft' ? 'Opportunity saved as a draft.' : 'Opportunity published successfully.';
      closeForm();
      setNotice(message);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  // Reset the district when the selected province changes.
  function updateProvince(province) {
    setForm({ ...form, province, district: province === 'Nationwide' ? 'Nationwide' : '', ...(province === 'Nationwide' && !form.location ? { location: 'Nepal' } : {}) });
  }
  // Accept, decline, or return one application to pending.
  async function updateStatus(id, status) { try { await api(`/applications/${id}/status`, { method: 'PATCH', body: { status } }); load(); } catch (e) { setError(e.message); } }
  // Close an opportunity after confirmation.
  async function closeOpportunity(id) { if (!window.confirm('Close this opportunity? It will no longer appear publicly.')) return; try { await api(`/opportunities/${id}`, { method: 'DELETE' }); setNotice('Opportunity closed. You can reopen it from Edit.'); load(); } catch (e) { setError(e.message); } }
  // Save attendance and contributed hours for one volunteer.
  async function recordAttendance(id) { const entry = attendance[id] || { attendance: 'present', hours: 1 }; try { await api(`/applications/${id}/attendance`, { method: 'PATCH', body: entry }); load(); } catch (e) { setError(e.message); } }

  return <main className="dashboard-page"><DashboardTop eyebrow="Organisation dashboard" title={user.organisationName || `Hello, ${user.name.split(' ')[0]}.`} text="Create opportunities, welcome volunteers, and keep every contribution visible." action={<button className="button primary" onClick={openCreate}><Plus /> Create opportunity</button>} />
    {!user.verified && <div className="container verification-note"><Sparkles /><div><strong>Organisation verification pending</strong><p>You can create opportunities now. An administrator can add a verified badge to your profile.</p></div></div>}
    <div className="container stats-grid"><Stat icon={Activity} value={opportunities.filter((item) => item.status === 'published').length} label="Open opportunities" /><Stat icon={FileText} value={pending} label="Applications to review" tone="gold" /><Stat icon={UsersRound} value={accepted} label="Volunteers accepted" tone="mint" /></div>
    {error && <div className="container alert error">{error}</div>}
    {notice && <div className="container alert success">{notice}</div>}
    <section className="container dashboard-section"><div className="section-heading split compact"><div><p className="eyebrow">Your activities</p><h2>Opportunities</h2></div><span>{opportunities.length} total</span></div><div className="panel table-wrap">{opportunities.length ? <table><thead><tr><th>Opportunity</th><th>Date</th><th>Status</th><th>Capacity</th><th>Management</th></tr></thead><tbody>{opportunities.map((item) => <tr key={item._id}><td><Link to={`/opportunities/${item._id}`}><strong>{item.title}</strong><small>{item.location}</small></Link></td><td>{formatDate(item.date)}</td><td><Status value={item.status} /></td><td>{item.capacity}</td><td><div className="flex items-center gap-2"><button className="table-action" onClick={() => openEdit(item)}><Pencil size={14} /> Edit</button>{item.status !== 'closed' && <button className="table-action danger" onClick={() => closeOpportunity(item._id)}>Close</button>}</div></td></tr>)}</tbody></table> : <div className="empty-state small"><CalendarDays /><h3>Share your first opportunity</h3><p>Let volunteers know where their help can matter.</p><button className="button primary" onClick={openCreate}>Create opportunity</button></div>}</div></section>
    <section className="container dashboard-section"><div className="section-heading compact"><p className="eyebrow">People ready to help</p><h2>Applications</h2></div><div className="application-list">{applications.length ? applications.map((item) => <article className="panel application-row" key={item._id}><div className="applicant-avatar">{item.volunteer?.name.charAt(0)}</div><div className="application-person"><h3>{item.volunteer?.name}</h3><p>{item.opportunity?.title}</p><small>{item.volunteer?.location || 'Location not added'} · {item.volunteer?.skills?.slice(0, 3).join(', ') || 'Skills not added'}</small></div><Status value={item.status} /><div className="application-actions">{item.status === 'pending' && <><button className="approve" onClick={() => updateStatus(item._id, 'accepted')}><CheckCircle2 /> Accept</button><button className="decline" onClick={() => updateStatus(item._id, 'declined')}><XCircle /> Decline</button></>}{item.status === 'accepted' && <div className="attendance-control"><select value={attendance[item._id]?.attendance || item.attendance || 'present'} onChange={(e) => setAttendance({ ...attendance, [item._id]: { ...(attendance[item._id] || {}), attendance: e.target.value } })}><option value="not-marked">Not marked</option><option value="present">Present</option><option value="absent">Absent</option></select><input type="number" min="0" step="0.5" value={attendance[item._id]?.hours ?? item.hours ?? 0} onChange={(e) => setAttendance({ ...attendance, [item._id]: { ...(attendance[item._id] || {}), hours: e.target.value } })} title="Hours" /><button onClick={() => recordAttendance(item._id)}>Save</button></div>}</div></article>) : <div className="panel empty-state small"><UsersRound /><h3>No applications yet</h3><p>Applications will appear here when volunteers respond.</p></div>}</div></section>
    {showForm && <div className="modal-backdrop" onMouseDown={closeForm}><div className="modal wide" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={closeForm}>×</button><p className="eyebrow">{editingId ? 'Manage opportunity' : 'New opportunity'}</p><h2>{editingId ? 'Update opportunity details.' : 'Invite people to take part.'}</h2><form className="form-stack" onSubmit={saveOpportunity}><div className="form-grid"><label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. River clean-up day" /></label><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{['Environment', 'Education', 'Health', 'Disaster Response', 'Fundraising', 'Social Work', 'Community', 'Animal Welfare', 'Other'].map((x) => <option key={x}>{x}</option>)}</select></label></div><label>Description<textarea required rows="6" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Explain the activity, what volunteers will do, and what they should bring…" /></label><p className="form-hint"><Sparkles size={14} /> The smart summary is refreshed when the description changes.</p><label>Cover image URL <small>(optional)</small><input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/images/opportunities/example.jpg or https://…" /></label><div className="form-grid"><label>Province<select required value={form.province} onChange={(e) => updateProvince(e.target.value)}><option value="">Select province</option>{OPPORTUNITY_PROVINCES.map((province) => <option key={province} value={province}>{province === 'Nationwide' ? 'Nationwide / remote' : province}</option>)}</select></label><label>District<select required value={form.district} disabled={!form.province || form.province === 'Nationwide'} onChange={(e) => setForm({ ...form, district: e.target.value })}><option value="">{form.province ? 'Select district' : 'Select province first'}</option>{districtsForProvince(form.province).map((district) => <option key={district} value={district}>{district}</option>)}</select></label><label>Municipality or local area<input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Pokhara Metropolitan City" /></label><label>Activity date<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>End date <small>(optional)</small><input type="date" min={form.date || undefined} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label><label>Application deadline<input type="date" max={form.date || undefined} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label><label>Commitment<select value={form.commitment} onChange={(e) => setForm({ ...form, commitment: e.target.value })}><option>One-time</option><option>Short-term</option><option>Long-term</option><option>Flexible</option></select></label><label>Capacity<input required min="1" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></label><label>Duration<input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 4 hours" /></label><label>Visibility<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option></select></label></div><label>Helpful skills <small>(comma separated)</small><input value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} placeholder="First aid, Teaching, Photography" /></label><label>Matching interests <small>(comma separated)</small><input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="Health, Community" /></label><label className="check-label"><input type="checkbox" checked={form.remote} onChange={(e) => setForm({ ...form, remote: e.target.checked })} /> This opportunity can be done remotely</label><button className="button primary large full" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : form.status === 'draft' ? 'Save draft' : 'Publish opportunity'}</button></form></div></div>}
    <TwoFactorSecurity />
  </main>;
}

// Load statistics and account records for the admin view.
function AdminDashboard({ user }) {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  // Request statistics and users together.
  const load = () => Promise.all([api('/admin/stats'), api('/admin/users')]).then(([s, u]) => { setStats(s); setUsers(u.users); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const organisations = useMemo(() => users.filter((item) => item.role === 'organisation'), [users]);
  // Update an account and reload the latest admin data.
  async function update(id, changes) { try { await api(`/admin/users/${id}`, { method: 'PATCH', body: changes }); load(); } catch (e) { setError(e.message); } }
  return <main className="dashboard-page"><DashboardTop eyebrow="Administrator" title="Platform overview" text="Keep the Volunteer Nepal community active, credible, and healthy." />
    <div className="container stats-grid four"><Stat icon={UsersRound} value={stats.volunteers || 0} label="Volunteers" /><Stat icon={Activity} value={stats.organisations || 0} label="Organisations" tone="mint" /><Stat icon={CalendarDays} value={stats.opportunities || 0} label="Opportunities" tone="gold" /><Stat icon={Clock3} value={stats.hours || 0} label="Hours recorded" tone="rose" /></div>{error && <div className="container alert error">{error}</div>}
    <section className="container dashboard-section"><div className="section-heading compact"><p className="eyebrow">Trust & safety</p><h2>Organisation review</h2></div><div className="panel table-wrap"><table><thead><tr><th>Organisation</th><th>Contact</th><th>Joined</th><th>Verification</th><th>Account</th></tr></thead><tbody>{organisations.map((item) => <tr key={item._id}><td><strong>{item.organisationName || item.name}</strong><small>{item.location || 'No location'}</small></td><td>{item.email}</td><td>{formatDate(item.createdAt)}</td><td><button className={item.verified ? 'mini-button verified-button' : 'mini-button'} onClick={() => update(item._id, { verified: !item.verified })}>{item.verified ? 'Verified' : 'Verify'}</button></td><td><button className={item.active ? 'mini-button' : 'mini-button danger'} onClick={() => update(item._id, { active: !item.active })}>{item.active ? 'Active' : 'Suspended'}</button></td></tr>)}</tbody></table>{!organisations.length && <div className="empty-state small"><Activity /><h3>No organisations yet</h3></div>}</div></section>
    <section className="container dashboard-section"><div className="section-heading compact"><p className="eyebrow">Recent accounts</p><h2>Community members</h2></div><div className="panel table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>{users.slice(0, 20).map((item) => <tr key={item._id}><td><strong>{item.name}</strong></td><td>{item.email}</td><td><Status value={item.role} /></td><td>{item.active ? 'Active' : 'Suspended'}</td></tr>)}</tbody></table></div></section>
    <TwoFactorSecurity />
  </main>;
}
