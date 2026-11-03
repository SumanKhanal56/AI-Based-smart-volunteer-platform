// This page shows full opportunity details and the application form.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, Sparkles, UsersRound } from 'lucide-react';
import { api, formatDate } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

// Load one opportunity and manage its volunteer application form.
export default function OpportunityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [message, setMessage] = useState('');
  const [showApply, setShowApply] = useState(false);
  const [status, setStatus] = useState({ busy: false, error: '', success: '' });
  // Load the selected opportunity whenever the URL ID changes.
  useEffect(() => { api(`/opportunities/${id}`).then((data) => setItem(data.opportunity)).catch((e) => setStatus((s) => ({ ...s, error: e.message }))); }, [id]);

  // Submit the volunteer's message as a new application.
  async function apply(event) {
    event.preventDefault();
    // Signed-out users return here after completing login.
    if (!user) { navigate('/login', { state: { from: { pathname: `/opportunities/${id}` } } }); return; }
    setStatus({ busy: true, error: '', success: '' });
    try { await api(`/applications/${id}`, { method: 'POST', body: { message } }); setStatus({ busy: false, error: '', success: 'Application sent! You can track it from your dashboard.' }); setShowApply(false); }
    catch (e) { setStatus({ busy: false, error: e.message, success: '' }); }
  }

  if (!item) return <main className="page-loader">{status.error ? <div className="alert error">{status.error}</div> : <span className="spinner" />}</main>;
  const org = item.organisation?.organisationName || item.organisation?.name;
  return <main className="detail-page"><section className="detail-hero"><div className="container"><Link className="back-link" to="/opportunities"><ArrowLeft /> All opportunities</Link><div className="detail-title"><div><span className="category-chip standalone">{item.category}</span><h1>{item.title}</h1><p className="org-line large">Hosted by {org} {item.organisation?.verified && <span className="verified">✓ Verified</span>}</p></div>{item.image ? <img className="detail-cover" src={item.image} alt={`Cover for ${item.title}`} /> : <div className="detail-letter">{item.title.charAt(0)}</div>}</div></div></section>
    <section className="container detail-grid"><article className="detail-main"><div className="smart-summary"><Sparkles /><div><span>Smart summary</span><p>{item.summary}</p></div></div><h2>About this opportunity</h2>{item.description.split('\n').map((text, index) => <p key={index}>{text}</p>)}
      {item.requiredSkills?.length > 0 && <><h2>Helpful skills</h2><div className="tag-list">{item.requiredSkills.map((skill) => <span key={skill}><CheckCircle2 />{skill}</span>)}</div></>}
      <h2>About the organiser</h2><div className="organiser-box"><span>{org?.charAt(0)}</span><div><h3>{org}</h3><p>{item.organisation?.bio || 'A community partner creating meaningful ways for people to contribute.'}</p></div></div>
    </article><aside className="apply-card"><h3>Opportunity details</h3><div className="detail-facts"><div><CalendarDays /><span><small>Date</small>{formatDate(item.date, 'long')}</span></div><div><MapPin /><span><small>Location</small>{item.remote ? 'Remote / ' : ''}{[item.location, item.district !== item.location ? item.district : '', item.province !== 'Nationwide' ? item.province : ''].filter(Boolean).join(', ') || 'Nationwide'}</span></div><div><Clock3 /><span><small>Commitment</small>{item.commitment}{item.duration && ` · ${item.duration}`}</span></div><div><UsersRound /><span><small>Places</small>{Math.max(0, item.capacity - item.accepted)} of {item.capacity} remaining</span></div></div>
      {item.deadline && <p className="deadline">Apply by {formatDate(item.deadline)}</p>}
      {user?.role === 'volunteer' || !user ? <button className="button primary large full" onClick={() => setShowApply(true)}>Apply now</button> : <p className="role-notice">Volunteer accounts can apply for this opportunity.</p>}
      {status.success && <div className="alert success">{status.success}</div>}{status.error && <div className="alert error">{status.error}</div>}
    </aside></section>
    {showApply && <div className="modal-backdrop" onMouseDown={() => setShowApply(false)}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setShowApply(false)}>×</button><p className="eyebrow">Take the first step</p><h2>Apply for {item.title}</h2><p>Tell the organiser briefly why this opportunity interests you.</p><form onSubmit={apply} className="form-stack"><label>Your message<textarea rows="5" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="I’d love to help because…" /></label><button className="button primary large full" disabled={status.busy}>{status.busy ? 'Sending…' : 'Send application'}</button></form></div></div>}
  </main>;
}
