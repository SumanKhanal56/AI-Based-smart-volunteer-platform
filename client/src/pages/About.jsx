// This page explains the purpose of Volunteer Nepal.
import { Building2, CheckCircle2, Search, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

// Render the platform purpose and role information.
// Render the platform purpose and role information.
export default function About() {
  return <main><section className="page-hero about-hero"><div className="container narrow"><p className="eyebrow">Why Volunteer Nepal</p><h1>Good intentions deserve a <em>clear path.</em></h1><p>We bring volunteers and trusted community organisations together in one simple, transparent place.</p></div></section>
    <section className="section container"><div className="about-intro"><div><p className="eyebrow">The challenge</p><h2>Opportunity is everywhere. Information isn’t.</h2></div><p>Volunteer activities in Nepal are often scattered across social media, messaging groups, and personal networks. Great people miss great causes. Volunteer Nepal makes those connections visible and manageable.</p></div></section>
    <section className="section pale-section"><div className="container"><div className="section-heading"><p className="eyebrow">One platform, three perspectives</p><h2>Built for the whole community.</h2></div><div className="role-grid"><div><UserRound /><h3>For volunteers</h3><p>Build your profile, receive smart recommendations, apply with confidence, and keep your contribution history in one place.</p></div><div><Building2 /><h3>For organisations</h3><p>Publish opportunities, reach relevant people, manage applications, and recognise attendance and hours.</p></div><div><CheckCircle2 /><h3>For administrators</h3><p>Verify organisations, oversee activity, and help keep the platform useful and trustworthy.</p></div></div></div></section>
    <section className="section container centered-cta"><Search /><h2>Your next meaningful day could start here.</h2><p>Browse the opportunities already bringing people together.</p><Link className="button primary large" to="/opportunities">Explore opportunities</Link></section>
  </main>;
}
