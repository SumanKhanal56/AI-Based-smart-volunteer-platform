// This component shows the volunteer dashboard and activity pages.
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, Bot, CheckCircle2, Clock3, FileCheck2, FileText, History, LayoutDashboard,
  LogOut, Menu, Search, Settings, Sparkles, UserRound, X
} from 'lucide-react';
import { api, formatDate } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import OpportunityCard from './OpportunityCard.jsx';
import TwoFactorSecurity from './TwoFactorSecurity.jsx';
import Opportunities from '../pages/Opportunities.jsx';
import Profile from '../pages/Profile.jsx';
import NotificationsPage from './NotificationsPage.jsx';
import SimpleBarChart from './SimpleBarChart.jsx';

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/opportunities', label: 'Find Opportunities', icon: Search },
  { to: '/dashboard/recommendations', label: 'AI Recommendations', icon: Sparkles },
  { to: '/dashboard/chatbot', label: 'Chatbot', icon: Bot },
  { to: '/dashboard/applications', label: 'Applied Opportunities', icon: FileCheck2 },
  { to: '/dashboard/history', label: 'Volunteer History', icon: History },
  { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { to: '/dashboard/profile', label: 'My Profile', icon: UserRound },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings }
];

// Reuse the same heading layout on volunteer pages.
function PageHeading({ eyebrow, title, text, action }) {
  return <div className="volunteer-page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>{action}</div>;
}

// Display one volunteer total in a statistics card.
function Stat({ icon: Icon, value, label, tone = '' }) {
  return <div className={`stat-card ${tone}`}><span><Icon /></span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

// Show an application status using its matching color class.
function Status({ value }) {
  return <span className={`status status-${value}`}>{value}</span>;
}

// Show guidance when no volunteer records are available.
function EmptyState({ icon: Icon, title, text, action }) {
  return <div className="panel volunteer-empty"><Icon /><h3>{title}</h3><p>{text}</p>{action}</div>;
}

// Display applications or completed history in a reusable table.
function ApplicationTable({ applications, onWithdraw, historyOnly = false }) {
  if (!applications.length) {
    return <EmptyState
      icon={historyOnly ? History : FileText}
      title={historyOnly ? 'No completed activities yet' : 'No applications yet'}
      text={historyOnly ? 'Completed activities and verified hours will appear here.' : 'Browse opportunities and apply when you find the right match.'}
      action={!historyOnly && <NavLink className="button primary" to="/dashboard/opportunities">Find opportunities</NavLink>}
    />;
  }

  return <div className="panel table-wrap"><table><thead><tr><th>Opportunity</th><th>Date</th><th>Status</th><th>Attendance</th><th>{historyOnly ? 'Hours' : 'Action'}</th></tr></thead><tbody>{applications.map((item) => <tr key={item._id}>
    <td><NavLink to={`/opportunities/${item.opportunity?._id}`}><strong>{item.opportunity?.title || 'Closed opportunity'}</strong><small>{item.opportunity?.organisation?.organisationName || item.opportunity?.organisation?.name || 'Organisation unavailable'}</small></NavLink></td>
    <td>{formatDate(item.opportunity?.date)}</td>
    <td><Status value={item.status} /></td>
    <td>{item.attendance === 'present' ? 'Present' : String(item.attendance || 'not-marked').replace('-', ' ')}</td>
    <td>{historyOnly ? `${item.hours || 0} hours` : ['pending', 'accepted'].includes(item.status) && <button className="table-action" onClick={() => onWithdraw(item._id)}>Withdraw</button>}</td>
  </tr>)}</tbody></table></div>;
}

// Calculate volunteer totals and prepare the six-month hours chart.
function Overview({ user, applications, recommended, error, onWithdraw }) {
  const hours = applications.reduce((sum, item) => sum + (item.attendance === 'present' ? Number(item.hours || 0) : 0), 0);
  const completed = applications.filter((item) => item.attendance === 'present').length;
  const accepted = applications.filter((item) => item.status === 'accepted').length;
  const monthlyHistory = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const month = date.getMonth();
    const year = date.getFullYear();
    const value = applications.reduce((total, item) => {
      if (item.attendance !== 'present') return total;
      const activityDate = new Date(item.updatedAt || item.opportunity?.date || item.createdAt);
      return activityDate.getMonth() === month && activityDate.getFullYear() === year ? total + Number(item.hours || 0) : total;
    }, 0);
    return { label: date.toLocaleDateString('en-GB', { month: 'short' }), value };
  });

  return <>
    <PageHeading eyebrow="Volunteer dashboard" title={`Namaste, ${user.name.split(' ')[0]}.`} text="See your progress, current applications, and the strongest opportunities for your profile." action={<NavLink className="button primary" to="/dashboard/opportunities">Find opportunities</NavLink>} />
    <div className="stats-grid four"><Stat icon={FileText} value={applications.length} label="Total applications" /><Stat icon={FileCheck2} value={accepted} label="Accepted applications" tone="gold" /><Stat icon={CheckCircle2} value={completed} label="Completed activities" tone="mint" /><Stat icon={Clock3} value={hours} label="Total volunteer hours" tone="rose" /></div>
    {error && <div className="alert error">{error}</div>}
    <section className="volunteer-section"><SimpleBarChart title="Volunteer hours history" description="Verified hours recorded from completed activities during the last six months." data={monthlyHistory} valueSuffix="h" /></section>
    <section className="volunteer-section"><div className="section-heading split compact"><div><p className="eyebrow">Made for you</p><h2>AI recommendations</h2></div><NavLink className="text-link dark" to="/dashboard/recommendations">View all matches</NavLink></div>
      {recommended.length ? <div className="opportunity-grid">{recommended.slice(0, 3).map((item) => <OpportunityCard key={item._id} opportunity={item} ranked />)}</div> : <EmptyState icon={Sparkles} title="Your matches are taking shape" text="Keep your interests, skills, and location updated to improve recommendations." action={<NavLink className="button secondary" to="/dashboard/profile">Complete profile</NavLink>} />}
    </section>
    <section className="volunteer-section"><div className="section-heading split compact"><div><p className="eyebrow">Recent activity</p><h2>Your applications</h2></div><NavLink className="text-link dark" to="/dashboard/applications">View all applications</NavLink></div><ApplicationTable applications={applications.slice(0, 5)} onWithdraw={onWithdraw} /></section>
  </>;
}

// Display all opportunities ranked for the volunteer profile.
function Recommendations({ recommended, error }) {
  return <><PageHeading eyebrow="Smart matching" title="AI recommendations" text="Ranked using your interests, skills, location, and previous volunteering activity." />{error && <div className="alert error">{error}</div>}{recommended.length ? <div className="opportunity-grid">{recommended.map((item) => <OpportunityCard key={item._id} opportunity={item} ranked />)}</div> : <EmptyState icon={Sparkles} title="No recommendations yet" text="Complete your profile or check again when more opportunities are published." action={<NavLink className="button primary" to="/dashboard/profile">Update profile</NavLink>} />}</>;
}

// Open the shared chatbot when its dashboard page is selected.
function ChatbotPage() {
  useEffect(() => { window.dispatchEvent(new Event('volunterr:chatbot-open')); }, []);
  return <><PageHeading eyebrow="AI assistant" title="Volunteer guide" text="Ask about current opportunities, preparation, applications, community service, or volunteering in Nepal." /><div className="panel volunteer-assistant-card"><Bot /><div><h2>The Volunteer guide is ready.</h2><p>The chat window opens automatically and keeps using the existing AI assistant and live platform data.</p></div><button className="button primary" onClick={() => window.dispatchEvent(new Event('volunterr:chatbot-open'))}>Open chatbot</button></div></>;
}

// Convert application changes into simple dashboard messages.
function Notifications({ applications }) {
  const notifications = useMemo(() => applications.map((item) => {
    const title = item.opportunity?.title || 'an opportunity';
    if (item.attendance === 'present') return { id: item._id, tone: 'complete', title: 'Activity added to your history', text: `${title} recorded ${item.hours || 0} contributed hours.`, date: item.updatedAt };
    if (item.status === 'accepted') return { id: item._id, tone: 'accepted', title: 'Application accepted', text: `You were accepted for ${title}.`, date: item.updatedAt };
    if (item.status === 'declined') return { id: item._id, tone: 'declined', title: 'Application update', text: `Your application for ${title} was not selected.`, date: item.updatedAt };
    if (item.status === 'withdrawn') return { id: item._id, tone: 'muted', title: 'Application withdrawn', text: `You withdrew from ${title}.`, date: item.updatedAt };
    return { id: item._id, tone: 'pending', title: 'Application submitted', text: `Your application for ${title} is awaiting review.`, date: item.createdAt };
  }), [applications]);

  return <><PageHeading eyebrow="Updates" title="Notifications" text="Application and participation updates generated from your current account activity." />{notifications.length ? <div className="volunteer-notifications">{notifications.map((item) => <article className={`panel notification-card ${item.tone}`} key={item.id}><span><Bell /></span><div><h3>{item.title}</h3><p>{item.text}</p><small>{formatDate(item.date)}</small></div></article>)}</div> : <EmptyState icon={Bell} title="No notifications yet" text="Updates will appear after you apply for an opportunity." />}</>;
}

// Display account security settings.
function SettingsPage() {
  return <><PageHeading eyebrow="Account" title="Settings" text="Manage account security and sign-in protection." /><div className="volunteer-settings"><TwoFactorSecurity /></div></>;
}

// Load volunteer data and display the page selected in the sidebar.
export default function VolunteerPortal({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [applications, setApplications] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Load applications and recommendations together to reduce waiting time.
  const load = () => Promise.all([api('/applications/mine/list'), api('/opportunities/recommended')])
    .then(([applicationData, recommendationData]) => {
      setApplications(applicationData.applications);
      setRecommended(recommendationData.opportunities);
      setError('');
    })
    .catch((requestError) => setError(requestError.message));

  useEffect(() => { load(); }, []);

  // Withdraw an active application and refresh the dashboard.
  async function withdraw(id) {
    try {
      await api(`/applications/${id}/withdraw`, { method: 'PATCH' });
      await load();
    } catch (requestError) { setError(requestError.message); }
  }

  // Clear the login session and return to the login page.
  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  const completed = applications.filter((item) => item.attendance === 'present');
  const section = location.pathname.replace(/^\/dashboard\/?/, '') || 'dashboard';
  let content;
  if (section === 'dashboard') content = <Overview user={user} applications={applications} recommended={recommended} error={error} onWithdraw={withdraw} />;
  else if (section === 'opportunities') content = <Opportunities />;
  else if (section === 'recommendations') content = <Recommendations recommended={recommended} error={error} />;
  else if (section === 'chatbot') content = <ChatbotPage />;
  else if (section === 'applications') content = <><PageHeading eyebrow="Your journey" title="Applied opportunities" text="Track each application and withdraw from active applications when necessary." />{error && <div className="alert error">{error}</div>}<ApplicationTable applications={applications} onWithdraw={withdraw} /></>;
  else if (section === 'history') content = <><PageHeading eyebrow="Your impact" title="Volunteer history" text="A verified record of activities attended and hours contributed." /><ApplicationTable applications={completed} onWithdraw={withdraw} historyOnly /></>;
  else if (section === 'notifications') content = <NotificationsPage />;
  else if (section === 'profile') content = <Profile />;
  else if (section === 'settings') content = <SettingsPage />;
  else content = <Navigate to="/dashboard" replace />;

  return <div className="volunteer-portal">
    <aside className={`volunteer-sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="volunteer-sidebar-head"><div className="volunteer-sidebar-user"><span>{user.name.charAt(0)}</span><div><strong>{user.name}</strong><small>Volunteer account</small></div></div><button onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle dashboard navigation">{menuOpen ? <X /> : <Menu />}</button></div>
      <nav aria-label="Volunteer dashboard navigation">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><Icon /><span>{label}</span></NavLink>)}</nav>
      <button className="volunteer-logout" onClick={signOut}><LogOut /><span>Logout</span></button>
    </aside>
    <section className="volunteer-content">{content}</section>
  </div>;
}
