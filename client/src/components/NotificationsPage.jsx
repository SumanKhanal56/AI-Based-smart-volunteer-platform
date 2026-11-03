// This component displays saved account notifications.
import { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, formatDate } from '../lib/api.js';

// Load and manage the logged-in user's saved notifications.
// Load and manage the logged-in user's saved notifications.
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');

  // Load saved notifications and the unread total from MongoDB through the API.
  const load = () => api('/notifications')
    .then((data) => {
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setError('');
    })
    .catch((requestError) => setError(requestError.message));

  useEffect(() => { load(); }, []);

  // Mark one saved notification as read.
  async function markRead(id) {
    try {
      // Update one notification, then reload the list and unread badge.
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      await load();
      window.dispatchEvent(new Event('volunterr:notifications-refresh'));
    } catch (requestError) { setError(requestError.message); }
  }

  // Mark all saved notifications as read.
  async function markAllRead() {
    try {
      // Update every unread notification owned by this user.
      await api('/notifications/read-all', { method: 'PATCH' });
      await load();
      window.dispatchEvent(new Event('volunterr:notifications-refresh'));
    } catch (requestError) { setError(requestError.message); }
  }

  return <>
    <div className="volunteer-page-heading"><div><p className="eyebrow">Updates</p><h1>Notifications</h1><p>Important application, attendance, and account activity in one place.</p></div>{unreadCount > 0 && <button className="button secondary" onClick={markAllRead}><CheckCheck size={17} /> Mark all as read</button>}</div>
    {error && <div className="alert error">{error}</div>}
    <section className="notification-section">
      <div className="section-heading compact"><p className="eyebrow">For you</p><h2>Account notifications</h2></div>
      {notifications.length ? <div className="volunteer-notifications">{notifications.map((item) => <article className={`panel stored-notification ${item.read ? 'read' : 'unread'}`} key={item._id}>
        <span className="stored-notification-icon"><Sparkles /></span>
        <div className="stored-notification-body"><div className="stored-notification-title"><h3>{item.title}</h3>{!item.read && <em>New</em>}</div><p>{item.message}</p><small>{formatDate(item.createdAt)}</small>
          {item.nextSteps?.length > 0 && <div className="notification-next-steps">{item.nextSteps.map((step, index) => step.to ? <Link key={step.title} to={step.to}><strong>{index + 1}. {step.title}</strong><small>{step.detail}</small></Link> : <div key={step.title}><strong>{index + 1}. {step.title}</strong><small>{step.detail}</small></div>)}</div>}
        </div>
        {!item.read && <button className="notification-read-button" onClick={() => markRead(item._id)}><Check size={16} /> Mark read</button>}
      </article>)}</div> : <div className="panel volunteer-empty"><Bell /><h3>No account notifications yet</h3><p>New platform messages will appear here.</p></div>}
    </section>
  </>;
}
