// This component shows the admin dashboard and management pages.
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, BarChart3, BellRing, Building2, CalendarDays, CheckCircle2,
  Clock3, ExternalLink, FileText, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck,
  UserCog, UsersRound, X
} from 'lucide-react';
import { api, formatDate } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import SimplePieChart from './SimplePieChart.jsx';
import TwoFactorSecurity from './TwoFactorSecurity.jsx';

const navigation = [
  { to: '/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/users', label: 'User Management', icon: UserCog },
  { to: '/dashboard/organizations', label: 'Organizations', icon: Building2 },
  { to: '/dashboard/opportunities', label: 'Opportunities', icon: CalendarDays },
  { to: '/dashboard/analytics', label: 'Platform Analytics', icon: BarChart3 },
  { to: '/dashboard/reports', label: 'Notifications / Reports', icon: BellRing },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings }
];

// Reuse the same heading layout on every admin page.
function PageHeading({ eyebrow, title, text, action }) {
  return <div className="volunteer-page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>{action}</div>;
}

// Display one number in an analytics card.
function Stat({ icon: Icon, value, label, tone = '' }) {
  return <div className={`stat-card ${tone}`}><span><Icon /></span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

// Show a status using its matching color class.
function Status({ value }) {
  return <span className={`status status-${value}`}>{value}</span>;
}

// Show a friendly message when a table has no records.
function EmptyState({ icon: Icon, title, text }) {
  return <div className="panel volunteer-empty"><Icon /><h3>{title}</h3><p>{text}</p></div>;
}

// List users and provide account activation controls.
function UserTable({ users, currentUser, onUpdate }) {
  if (!users.length) return <EmptyState icon={UsersRound} title="No users found" text="Registered accounts will appear here." />;
  return <div className="panel table-wrap"><table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Account</th></tr></thead><tbody>{users.map((item) => {
    const isCurrentAdmin = String(item._id) === String(currentUser._id);
    return <tr key={item._id}><td><strong>{item.role === 'organisation' ? item.organisationName || item.name : item.name}</strong><small>{item.location || 'Location not added'}</small></td><td>{item.email}</td><td><Status value={item.role} /></td><td>{formatDate(item.createdAt)}</td><td><button disabled={isCurrentAdmin} title={isCurrentAdmin ? 'You cannot suspend your current session here.' : ''} className={item.active ? 'mini-button' : 'mini-button danger'} onClick={() => onUpdate(item._id, { active: !item.active })}>{isCurrentAdmin ? 'Current admin' : item.active ? 'Active' : 'Suspended'}</button></td></tr>;
  })}</tbody></table></div>;
}

// List organizations with verification and account controls.
function OrganizationTable({ organizations, onUpdate }) {
  if (!organizations.length) return <EmptyState icon={Building2} title="No organizations yet" text="Registered organization accounts will appear here." />;
  return <div className="panel table-wrap"><table><thead><tr><th>Organization</th><th>Contact</th><th>Joined</th><th>Verification</th><th>Account</th></tr></thead><tbody>{organizations.map((item) => <tr key={item._id}><td><strong>{item.organisationName || item.name}</strong><small>{[item.location, item.district, item.province].filter(Boolean).join(', ') || 'No location'}</small></td><td>{item.email}</td><td>{formatDate(item.createdAt)}</td><td><button className={item.verified ? 'mini-button verified-button' : 'mini-button'} onClick={() => onUpdate(item._id, { verified: !item.verified })}>{item.verified ? 'Verified' : 'Verify'}</button></td><td><button className={item.active ? 'mini-button' : 'mini-button danger'} onClick={() => onUpdate(item._id, { active: !item.active })}>{item.active ? 'Active' : 'Suspended'}</button></td></tr>)}</tbody></table></div>;
}

// List opportunities and let an admin publish or close them.
function OpportunityTable({ opportunities, onStatus }) {
  if (!opportunities.length) return <EmptyState icon={CalendarDays} title="No opportunities found" text="Organization opportunities will appear here." />;
  return <div className="panel table-wrap"><table><thead><tr><th>Opportunity</th><th>Organization</th><th>Location</th><th>Date</th><th>Status</th><th>Management</th></tr></thead><tbody>{opportunities.map((item) => <tr key={item._id}><td><strong>{item.title}</strong><small>{item.category}</small></td><td>{item.organisation?.organisationName || item.organisation?.name || 'Organization unavailable'}</td><td>{[item.district, item.province].filter(Boolean).join(', ') || item.location}</td><td>{formatDate(item.date)}</td><td><Status value={item.status} /></td><td><div className="flex items-center gap-2"><NavLink className="table-action" to={`/opportunities/${item._id}`}><ExternalLink size={14} /> View</NavLink><button className={item.status === 'published' ? 'mini-button danger' : 'mini-button verified-button'} onClick={() => onStatus(item._id, item.status === 'published' ? 'closed' : 'published')}>{item.status === 'published' ? 'Close' : 'Publish'}</button></div></td></tr>)}</tbody></table></div>;
}

// Convert live account totals into values used by the pie chart.
function Analytics({ stats }) {
  const volunteers = Number(stats.volunteers || 0);
  const organizations = Number(stats.organisations || 0);
  const admins = Math.max(0, Number(stats.users || 0) - volunteers - organizations);
  const accountChart = [
    { label: 'Volunteers', value: volunteers, color: '#10b981' },
    { label: 'Organizations', value: organizations, color: '#f59e0b' },
    { label: 'Administrators', value: admins, color: '#7c3aed' }
  ];

  return <><PageHeading eyebrow="Platform health" title="Platform analytics" text="A simple live summary using the statistics already provided by the admin API." /><div className="stats-grid four admin-analytics-grid"><Stat icon={UsersRound} value={stats.users || 0} label="Total users" /><Stat icon={UserCog} value={stats.volunteers || 0} label="Volunteers" tone="mint" /><Stat icon={Building2} value={stats.organisations || 0} label="Organizations" tone="gold" /><Stat icon={CalendarDays} value={stats.opportunities || 0} label="Opportunities" /><Stat icon={FileText} value={stats.applications || 0} label="Applications" tone="rose" /><Stat icon={Clock3} value={stats.hours || 0} label="Hours recorded" tone="mint" /></div><section className="volunteer-section"><SimplePieChart title="Account distribution" description="The current proportion of volunteer, organization, and administrator accounts registered on the platform." data={accountChart} /></section></>;
}

// Calculate simple moderation totals from existing account data.
function Reports({ users, organizations }) {
  const inactive = users.filter((item) => !item.active).length;
  const awaitingVerification = organizations.filter((item) => !item.verified).length;
  return <><PageHeading eyebrow="Moderation" title="Notifications / reports" text="This project does not currently have a separate reporting system. This page provides a simple moderation summary from existing account data." /><div className="admin-report-grid"><div className="panel admin-report-card"><span><BellRing /></span><div><strong>{awaitingVerification}</strong><h3>Organizations awaiting verification</h3><p>Open the Organizations page to review and verify these accounts.</p><NavLink className="text-link dark" to="/dashboard/organizations">Review organizations</NavLink></div></div><div className="panel admin-report-card"><span><ShieldCheck /></span><div><strong>{inactive}</strong><h3>Suspended accounts</h3><p>Review inactive volunteer, organization, or administrator accounts.</p><NavLink className="text-link dark" to="/dashboard/users">Open user management</NavLink></div></div></div></>;
}

// Load platform data and display the selected admin page.
export default function AdminPortal({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const organizations = useMemo(() => users.filter((item) => item.role === 'organisation'), [users]);
  const section = location.pathname.replace(/^\/dashboard\/?/, '') || 'overview';

  // Load statistics, users, and opportunities together.
  const load = () => Promise.all([api('/admin/stats'), api('/admin/users'), api('/opportunities/mine')])
    .then(([statsData, userData, opportunityData]) => {
      setStats(statsData);
      setUsers(userData.users);
      setOpportunities(opportunityData.opportunities);
      setError('');
    })
    .catch((requestError) => setError(requestError.message));

  useEffect(() => { load(); }, []);

  // Update account access or organization verification.
  async function updateUser(id, changes) {
    setError('');
    setNotice('');
    try {
      await api(`/admin/users/${id}`, { method: 'PATCH', body: changes });
      setNotice(changes.verified !== undefined ? 'Organization verification updated.' : 'Account status updated.');
      await load();
    } catch (requestError) { setError(requestError.message); }
  }

  // Publish or close an opportunity from the admin dashboard.
  async function updateOpportunityStatus(id, status) {
    if (status === 'closed' && !window.confirm('Close this opportunity? It will no longer appear publicly.')) return;
    setError('');
    setNotice('');
    try {
      await api(`/opportunities/${id}`, { method: 'PATCH', body: { status } });
      setNotice(status === 'published' ? 'Opportunity published successfully.' : 'Opportunity closed successfully.');
      await load();
    } catch (requestError) { setError(requestError.message); }
  }

  const recentUsers = users.slice(0, 8);
  let content;
  if (section === 'overview') content = <>
    <PageHeading eyebrow="Administrator" title="Admin dashboard" text="Keep the Volunteer Nepal community active, credible, and healthy." />
    <div className="stats-grid four"><Stat icon={UsersRound} value={stats.users || 0} label="Total users" /><Stat icon={Activity} value={stats.organisations || 0} label="Organizations" tone="mint" /><Stat icon={CalendarDays} value={stats.opportunities || 0} label="Opportunities" tone="gold" /><Stat icon={FileText} value={stats.applications || 0} label="Applications" tone="rose" /></div>
    <section className="volunteer-section"><div className="section-heading split compact"><div><p className="eyebrow">Recent accounts</p><h2>Community members</h2></div><NavLink className="text-link dark" to="/dashboard/users">Manage all users</NavLink></div><UserTable users={recentUsers} currentUser={user} onUpdate={updateUser} /></section>
  </>;
  else if (section === 'users') content = <><PageHeading eyebrow="Accounts" title="User management" text="View registered users and activate or suspend accounts using the existing admin controls." /><UserTable users={users} currentUser={user} onUpdate={updateUser} /></>;
  else if (section === 'organizations') content = <><PageHeading eyebrow="Trust and safety" title="Organizations" text="Review registered organizations, control account access, and manage verification badges." /><OrganizationTable organizations={organizations} onUpdate={updateUser} /></>;
  else if (section === 'opportunities') content = <><PageHeading eyebrow="Platform content" title="Opportunities" text="View every organization opportunity and publish or close listings when moderation is required." /><OpportunityTable opportunities={opportunities} onStatus={updateOpportunityStatus} /></>;
  else if (section === 'analytics') content = <Analytics stats={stats} />;
  else if (section === 'reports') content = <Reports users={users} organizations={organizations} />;
  else if (section === 'settings') content = <><PageHeading eyebrow="Account" title="Settings" text="Manage administrator account security and sign-in protection." /><div className="volunteer-settings"><TwoFactorSecurity /></div></>;
  else content = <Navigate to="/dashboard" replace />;

  // Clear the login session and return to the login page.
  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return <div className="volunteer-portal admin-portal">
    <aside className={`volunteer-sidebar admin-sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="volunteer-sidebar-head"><div className="volunteer-sidebar-user"><span>{user.name.charAt(0)}</span><div><strong>{user.name}</strong><small>Platform administrator</small></div></div><button onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle dashboard navigation">{menuOpen ? <X /> : <Menu />}</button></div>
      <nav aria-label="Admin dashboard navigation">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><Icon /><span>{label}</span></NavLink>)}</nav>
      <button className="volunteer-logout" onClick={signOut}><LogOut /><span>Logout</span></button>
    </aside>
    <section className="volunteer-content">{error && <div className="alert error organisation-alert">{error}</div>}{notice && <div className="alert success organisation-alert">{notice}</div>}{content}</section>
  </div>;
}
