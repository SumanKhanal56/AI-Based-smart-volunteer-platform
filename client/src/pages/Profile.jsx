// This page lets users view and update their profile.
import { useEffect, useState } from 'react';
import { Check, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { splitTags } from '../lib/api.js';
import { districtsForProvince, NEPAL_PROVINCES } from '../data/nepalLocations.js';

const organisationTypes = ['NGO', 'Non-profit', 'Community group', 'Youth club', 'School or college', 'Social enterprise', 'Government or local body', 'Other'];

// Load the current profile into a form and save allowed changes.
export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: '', bio: '', location: '', province: '', district: '', phone: '', interests: '', skills: '', organisationName: '', organisationType: '', registrationNumber: '', website: '' });
  const [status, setStatus] = useState({ busy: false, error: '', success: '' });

  useEffect(() => {
    if (user) setForm({ ...form, ...user, interests: user.interests?.join(', ') || '', skills: user.skills?.join(', ') || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Convert tag fields into arrays before sending profile changes.
  async function submit(event) {
    event.preventDefault();
    setStatus({ busy: true, error: '', success: '' });
    try {
      await updateProfile({ ...form, interests: splitTags(form.interests), skills: splitTags(form.skills) });
      setStatus({ busy: false, error: '', success: 'Profile saved.' });
    } catch (e) { setStatus({ busy: false, error: e.message, success: '' }); }
  }

  // Clear the old district when a different province is selected.
  function updateProvince(province) {
    setForm({ ...form, province, district: '' });
  }

  return <main className="dashboard-page"><div className="container dashboard-header"><div><p className="eyebrow">Your account</p><h1>Shape your profile.</h1><p>{user.role === 'volunteer' ? 'A complete profile makes your recommendations more relevant.' : 'Help volunteers understand the people behind your organisation.'}</p></div><div className="profile-avatar">{user.name.charAt(0)}</div></div>
    <div className="container profile-layout"><aside className="profile-tip"><Check /><h3>Make strong matches</h3><p>Your province, district, interests, and skills directly improve opportunity recommendations.</p></aside><form className="panel form-stack profile-form" onSubmit={submit}>
      <div className="form-grid"><label>{user.role === 'organisation' ? 'Contact person name' : 'Full name'}<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>{user.role === 'organisation' && <label>Organisation name<input required value={form.organisationName} onChange={(e) => setForm({ ...form, organisationName: e.target.value })} /></label>}</div>
      {user.role === 'organisation' && <label>Organisation type<select required value={form.organisationType} onChange={(e) => setForm({ ...form, organisationType: e.target.value })}><option value="">Select organisation type</option>{organisationTypes.map((type) => <option key={type}>{type}</option>)}</select></label>}
      <div className="form-grid"><label>Province<select required value={form.province} onChange={(e) => updateProvince(e.target.value)}><option value="">Select province</option>{NEPAL_PROVINCES.map((province) => <option key={province}>{province}</option>)}</select></label><label>District<select required disabled={!form.province} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}><option value="">{form.province ? 'Select district' : 'Select province first'}</option>{districtsForProvince(form.province).map((district) => <option key={district}>{district}</option>)}</select></label></div>
      <label>Municipality or local area<input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Pokhara Metropolitan City" /></label>
      <label>{user.role === 'organisation' ? 'About the organisation' : 'About you'}<textarea rows="4" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A short introduction…" /></label>
      <div className="form-grid"><label>{user.role === 'organisation' ? 'Focus areas' : 'Interests'}<input required value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="Education, Environment" /></label>{user.role === 'volunteer' && <label>Skills<input required value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Teaching, Design" /></label>}</div>
      <label>Phone {user.role === 'volunteer' && <small>(optional)</small>}<input required={user.role === 'organisation'} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
      {user.role === 'organisation' && <div className="form-grid"><label>Registration number <small>(optional)</small><input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} /></label><label>Website <small>(optional)</small><input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.org" /></label></div>}
      {status.error && <div className="alert error">{status.error}</div>}{status.success && <div className="alert success">{status.success}</div>}<button className="button primary" disabled={status.busy}><Save size={17} /> {status.busy ? 'Saving…' : 'Save profile'}</button>
    </form></div>
  </main>;
}
