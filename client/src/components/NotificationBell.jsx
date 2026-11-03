// This component displays the notification icon and unread count.
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

// Load the unread total and open the notifications page when clicked.
// Load the unread total and open the notifications page when clicked.
export default function NotificationBell({ user }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !['volunteer', 'organisation'].includes(user.role)) return undefined;
    let active = true;
    const load = () => api('/notifications?limit=1')
      .then((data) => { if (active) setUnreadCount(data.unreadCount || 0); })
      .catch(() => {});

    load();
    const quickRefresh = window.setTimeout(load, 2500);
    const interval = window.setInterval(load, 60000);
    window.addEventListener('volunterr:notifications-refresh', load);
    return () => {
      active = false;
      window.clearTimeout(quickRefresh);
      window.clearInterval(interval);
      window.removeEventListener('volunterr:notifications-refresh', load);
    };
  }, [user]);

  if (!user || !['volunteer', 'organisation'].includes(user.role)) return null;
  return <Link className="notification-bell" to="/dashboard/notifications" aria-label={`${unreadCount} unread notifications`} title="Notifications">
    <Bell size={18} />
    {unreadCount > 0 && <span>{unreadCount > 9 ? '9+' : unreadCount}</span>}
  </Link>;
}
