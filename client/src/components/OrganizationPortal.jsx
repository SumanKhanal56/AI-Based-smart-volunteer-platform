// This component shows the organization dashboard and management pages.
import { useEffect, useState } from 'react';
import { NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, Bell, Building2, CalendarDays, CheckCircle2, ClipboardList, FileText,
  LayoutDashboard, LogOut, Menu, Pencil, PlusCircle, Settings, Sparkles,
  UsersRound, X, XCircle
} from 'lucide-react';
import { api, formatDate, splitTags } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { districtsForProvince, OPPORTUNITY_PROVINCES } from '../data/nepalLocations.js';
import Profile from '../pages/Profile.jsx';
import TwoFactorSecurity from './TwoFactorSecurity.jsx';
import NotificationsPage from './NotificationsPage.jsx';
import SimpleBarChart from './SimpleBarChart.jsx';

const navigation = [
  { to: '/dashboard', label: 'Overview Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/opportunities', label: 'Manage Opportunities', icon: CalendarDays },
  { to: '/dashboard/create-opportunity', label: 'Create Opportunity', icon: PlusCircle },
  { to: '/dashboard/applications', label: 'Applications', icon: ClipboardList },
  { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { to: '/dashboard/profile', label: 'Organization Profile', icon: Building2 },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings }
];

const categories = ['Environment', 'Education', 'Health', 'Disaster Response', 'Fundraising', 'Social Work', 'Community', 'Animal Welfare', 'Other'];
const blankOpportunity = { title: '', description: '', summary: '', category: 'Community', location: '', district: '', province: '', remote: false, date: '', endDate: '', deadline: '', duration: '', commitment: 'One-time', requiredSkills: '', interests: '', capacity: 20, image: '', status: 'published', featured: false };

// Reuse the same heading layout on organization pages.
function PageHeading({ eyebrow, title, text, action }) {
  return <div className="volunteer-page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>{action}</div>;
}

// Display one organization total in a statistics card.
function Stat({ icon: Icon, value, label, tone = '' }) {
  return <div className={`stat-card ${tone}`}><span><Icon /></span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

// Show a status using its matching color class.
function Status({ value }) {
  return <span className={`status status-${value}`}>{value}</span>;
}

// Show guidance when no records are available.
function EmptyState({ icon: Icon, title, text, action }) {
  return <div className="panel volunteer-empty"><Icon /><h3>{title}</h3><p>{text}</p>{action}</div>;
}

// Display the controlled form used to create or edit an opportunity.
function OpportunityForm({ form, setForm, onSubmit, busy, editing }) {
  // Reset the district when the user selects a different province.
  function updateProvince(province) {
    setForm({ ...form, province, district: province === 'Nationwide' ? 'Nationwide' : '', ...(province === 'Nationwide' && !form.location ? { location: 'Nepal' } : {}) });
  }

  return <form className="panel form-stack organisation-opportunity-form" onSubmit={onSubmit}>
    <div className="form-grid"><label>Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. River clean-up day" /></label><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label></div>
    <label>Description<textarea required rows="6" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Explain the activity, volunteer responsibilities, and what participants should bring." /></label>
    <p className="form-hint"><Sparkles size={14} /> The smart summary is refreshed when the description changes.</p>
    <label>Cover image URL <small>(optional)</small><input value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="/images/opportunities/example.jpg or https://..." /></label>
    <div className="form-grid">
      <label>Province<select required value={form.province} onChange={(event) => updateProvince(event.target.value)}><option value="">Select province</option>{OPPORTUNITY_PROVINCES.map((province) => <option key={province} value={province}>{province === 'Nationwide' ? 'Nationwide / remote' : province}</option>)}</select></label>
      <label>District<select required value={form.district} disabled={!form.province || form.province === 'Nationwide'} onChange={(event) => setForm({ ...form, district: event.target.value })}><option value="">{form.province ? 'Select district' : 'Select province first'}</option>{districtsForProvince(form.province).map((district) => <option key={district}>{district}</option>)}</select></label>
      <label>Municipality or local area<input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="e.g. Pokhara Metropolitan City" /></label>
      <label>Activity date<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
      <label>End date <small>(optional)</small><input type="date" min={form.date || undefined} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
      <label>Application deadline<input type="date" max={form.date || undefined} value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></label>
      <label>Commitment<select value={form.commitment} onChange={(event) => setForm({ ...form, commitment: event.target.value })}><option>One-time</option><option>Short-term</option><option>Long-term</option><option>Flexible</option></select></label>
      <label>Capacity<input required min="1" type="number" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></label>
      <label>Duration<input value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} placeholder="e.g. 4 hours" /></label>
      <label>Visibility<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option></select></label>
    </div>
    <label>Helpful skills <small>(comma separated)</small><input value={form.requiredSkills} onChange={(event) => setForm({ ...form, requiredSkills: event.target.value })} placeholder="First aid, Teaching, Photography" /></label>
    <label>Matching interests <small>(comma separated)</small><input value={form.interests} onChange={(event) => setForm({ ...form, interests: event.target.value })} placeholder="Health, Community" /></label>
    <label className="check-label"><input type="checkbox" checked={form.remote} onChange={(event) => setForm({ ...form, remote: event.target.checked })} /> This opportunity can be done remotely</label>
    <button className="button primary large full" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : form.status === 'draft' ? 'Save draft' : 'Publish opportunity'}</button>
  </form>;
}

// Display opportunities with edit and close buttons.
function OpportunityTable({ opportunities, onEdit, onClose }) {
  if (!opportunities.length) return <EmptyState icon={CalendarDays} title="No opportunities yet" text="Create your first opportunity and invite volunteers to take part." action={<NavLink className="button primary" to="/dashboard/create-opportunity">Create opportunity</NavLink>} />;
  return <div className="panel table-wrap"><table><thead><tr><th>Opportunity</th><th>Date</th><th>Status</th><th>Capacity</th><th>Management</th></tr></thead><tbody>{opportunities.map((item) => <tr key={item._id}><td><NavLink to={`/opportunities/${item._id}`}><strong>{item.title}</strong><small>{item.location}</small></NavLink></td><td>{formatDate(item.date)}</td><td><Status value={item.status} /></td><td>{item.capacity}</td><td><div className="flex items-center gap-2"><button className="table-action" onClick={() => onEdit(item)}><Pencil size={14} /> Edit</button>{item.status !== 'closed' && <button className="table-action danger" onClick={() => onClose(item._id)}>Close</button>}</div></td></tr>)}</tbody></table></div>;
}

// Display applicants and the controls used to manage them.
function Applications({ applications, attendance, setAttendance, onStatus, onAttendance }) {
  if (!applications.length) return <EmptyState icon={UsersRound} title="No applications yet" text="Volunteer applications will appear here after people respond to your opportunities." />;
  return <div className="application-list">{applications.map((item) => <article className="panel application-row" key={item._id}><div className="applicant-avatar">{item.volunteer?.name?.charAt(0) || '?'}</div><div className="application-person"><h3>{item.volunteer?.name || 'Volunteer unavailable'}</h3><p>{item.opportunity?.title}</p><small>{item.volunteer?.location || 'Location not added'} · {item.volunteer?.skills?.slice(0, 3).join(', ') || 'Skills not added'}</small></div><Status value={item.status} /><div className="application-actions">{item.status === 'pending' && <><button className="approve" onClick={() => onStatus(item._id, 'accepted')}><CheckCircle2 /> Accept</button><button className="decline" onClick={() => onStatus(item._id, 'declined')}><XCircle /> Decline</button></>}{item.status === 'accepted' && <div className="attendance-control"><select value={attendance[item._id]?.attendance || item.attendance || 'present'} onChange={(event) => setAttendance({ ...attendance, [item._id]: { ...(attendance[item._id] || {}), attendance: event.target.value } })}><option value="not-marked">Not marked</option><option value="present">Present</option><option value="absent">Absent</option></select><input type="number" min="0" step="0.5" value={attendance[item._id]?.hours ?? item.hours ?? 0} onChange={(event) => setAttendance({ ...attendance, [item._id]: { ...(attendance[item._id] || {}), hours: event.target.value } })} title="Hours" /><button onClick={() => onAttendance(item._id)}>Save</button></div>}</div></article>)}</div>;
}

// Load organization data and display the selected management page.
export default function OrganizationPortal({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(blankOpportunity);
  const [editingId, setEditingId] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [attendance, setAttendance] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const section = location.pathname.replace(/^\/dashboard\/?/, '') || 'overview';

  // Load opportunities and applications together.
  const load = () => Promise.all([api('/opportunities/mine'), api('/applications/manage/list')])
    .then(([opportunityData, applicationData]) => {
      setOpportunities(opportunityData.opportunities);
      setApplications(applicationData.applications);
      setError('');
    })
    .catch((requestError) => setError(requestError.message));

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (section === 'create-opportunity') {
      setEditingId('');
      setForm(blankOpportunity);
      setNotice('');
      setError('');
    }
  }, [section]);

  // Convert a saved date into the format required by an HTML date input.
  function inputDate(value) {
    return value ? new Date(value).toISOString().slice(0, 10) : '';
  }

  // Copy an opportunity into the form so it can be edited.
  function openEdit(item) {
    setEditingId(item._id);
    setForm({ ...blankOpportunity, ...item, summary: '', date: inputDate(item.date), endDate: inputDate(item.endDate), deadline: inputDate(item.deadline), requiredSkills: item.requiredSkills?.join(', ') || '', interests: item.interests?.join(', ') || '' });
    setError('');
    setNotice('');
    setShowEdit(true);
  }

  // Create a new opportunity or save changes to an existing one.
  async function saveOpportunity(event) {
    event.preventDefault();
    if (form.deadline && form.date && form.deadline >= form.date) return setError('The application deadline must be before the activity date.');
    if (form.endDate && form.date && form.endDate < form.date) return setError('The end date cannot be before the activity date.');
    setBusy(true); setError(''); setNotice('');
    const body = { ...form, requiredSkills: splitTags(form.requiredSkills), interests: splitTags(form.interests), capacity: Number(form.capacity), endDate: form.endDate || null, deadline: form.deadline || null };
    try {
      await api(editingId ? `/opportunities/${editingId}` : '/opportunities', { method: editingId ? 'PATCH' : 'POST', body });
      setNotice(editingId ? 'Opportunity updated successfully.' : form.status === 'draft' ? 'Opportunity saved as a draft.' : 'Opportunity published successfully.');
      setShowEdit(false);
      setEditingId('');
      setForm(blankOpportunity);
      await load();
      navigate('/dashboard/opportunities');
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }

  // Close an opportunity after the organization confirms the action.
  async function closeOpportunity(id) {
    if (!window.confirm('Close this opportunity? It will no longer appear publicly.')) return;
    try { await api(`/opportunities/${id}`, { method: 'DELETE' }); setNotice('Opportunity closed. You can reopen it from Edit.'); await load(); } catch (requestError) { setError(requestError.message); }
  }

  // Accept or decline a volunteer application.
  async function updateStatus(id, status) {
    try { await api(`/applications/${id}/status`, { method: 'PATCH', body: { status } }); await load(); } catch (requestError) { setError(requestError.message); }
  }

  // Save attendance and contributed hours for an accepted volunteer.
  async function recordAttendance(id) {
    const entry = attendance[id] || { attendance: 'present', hours: 1 };
    try { await api(`/applications/${id}/attendance`, { method: 'PATCH', body: entry }); setNotice('Attendance saved.'); await load(); } catch (requestError) { setError(requestError.message); }
  }

  const published = opportunities.filter((item) => item.status === 'published').length;
  const acceptedVolunteers = new Set(applications.filter((item) => item.status === 'accepted').map((item) => String(item.volunteer?._id || item.volunteer))).size;
  const applicationChart = ['pending', 'accepted', 'declined', 'withdrawn'].map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: applications.filter((item) => item.status === status).length
  }));
  let content;

  if (section === 'overview') content = <>
    <PageHeading eyebrow="Organization dashboard" title={user.organisationName || `Hello, ${user.name.split(' ')[0]}.`} text="Create opportunities, welcome volunteers, and keep every contribution visible." action={<NavLink className="button primary" to="/dashboard/create-opportunity"><PlusCircle /> Create opportunity</NavLink>} />
    {!user.verified && <div className="verification-note"><Sparkles /><div><strong>Organization verification pending</strong><p>You can create opportunities now. An administrator can add a verified badge to your profile.</p></div></div>}
    <div className="stats-grid four"><Stat icon={CalendarDays} value={opportunities.length} label="Total opportunities" /><Stat icon={Activity} value={published} label="Active opportunities" tone="mint" /><Stat icon={FileText} value={applications.length} label="Total applications" tone="gold" /><Stat icon={UsersRound} value={acceptedVolunteers} label="Accepted volunteers" tone="rose" /></div>
    <section className="volunteer-section"><SimpleBarChart title="Applications by status" description="Current application totals across all opportunities managed by your organization." data={applicationChart} /></section>
    <section className="volunteer-section"><div className="section-heading split compact"><div><p className="eyebrow">Recent activity</p><h2>Your opportunities</h2></div><NavLink className="text-link dark" to="/dashboard/opportunities">Manage all</NavLink></div><OpportunityTable opportunities={opportunities.slice(0, 4)} onEdit={openEdit} onClose={closeOpportunity} /></section>
  </>;
  else if (section === 'opportunities') content = <><PageHeading eyebrow="Opportunity management" title="Manage opportunities" text="Edit published roles, manage drafts, or close opportunities that are no longer available." action={<NavLink className="button primary" to="/dashboard/create-opportunity"><PlusCircle /> Create opportunity</NavLink>} /><OpportunityTable opportunities={opportunities} onEdit={openEdit} onClose={closeOpportunity} /></>;
  else if (section === 'create-opportunity') content = <><PageHeading eyebrow="New opportunity" title="Invite people to take part." text="Describe the task clearly so the right volunteers can find and understand it." /><OpportunityForm form={form} setForm={setForm} onSubmit={saveOpportunity} busy={busy} editing={false} /></>;
  else if (section === 'applications') content = <><PageHeading eyebrow="Volunteer management" title="Applications" text="Review applicants, accept suitable volunteers, and record attendance and contributed hours." /><Applications applications={applications} attendance={attendance} setAttendance={setAttendance} onStatus={updateStatus} onAttendance={recordAttendance} /></>;
  else if (section === 'notifications') content = <NotificationsPage />;
  else if (section === 'profile') content = <Profile />;
  else if (section === 'settings') content = <><PageHeading eyebrow="Account" title="Settings" text="Manage account security and sign-in protection." /><div className="volunteer-settings"><TwoFactorSecurity /></div></>;
  else content = <Navigate to="/dashboard" replace />;

  // Clear the login session and return to the login page.
  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return <div className="volunteer-portal organisation-portal">
    <aside className={`volunteer-sidebar organisation-sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="volunteer-sidebar-head"><div className="volunteer-sidebar-user"><span>{(user.organisationName || user.name).charAt(0)}</span><div><strong>{user.organisationName || user.name}</strong><small>Organization account</small></div></div><button onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle dashboard navigation">{menuOpen ? <X /> : <Menu />}</button></div>
      <nav aria-label="Organization dashboard navigation">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><Icon /><span>{label}</span></NavLink>)}</nav>
      <button className="volunteer-logout" onClick={signOut}><LogOut /><span>Logout</span></button>
    </aside>
    <section className="volunteer-content">{error && <div className="alert error organisation-alert">{error}</div>}{notice && <div className="alert success organisation-alert">{notice}</div>}{content}</section>
    {showEdit && <div className="modal-backdrop" onMouseDown={() => setShowEdit(false)}><div className="modal wide" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowEdit(false)}>×</button><p className="eyebrow">Manage opportunity</p><h2>Update opportunity details.</h2><OpportunityForm form={form} setForm={setForm} onSubmit={saveOpportunity} busy={busy} editing /></div></div>}
  </div>;
}
