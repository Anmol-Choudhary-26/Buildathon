import { useEffect, useState } from 'react';
import { api } from './api';
import ListingCard from './components/ListingCard';
import HostReviewDashboard from './components/HostReviewDashboard';
import { supabase } from './supabase';

const initialForm = { name: '', email: '', phone: '', password: '', role: 'Seeker', professionTitle: '', workRoutine: 'Hybrid', hobbies: '' };
function Auth({ onAuthenticated }) {
  const [registering, setRegistering] = useState(true); const [form, setForm] = useState(initialForm); const [error, setError] = useState('');
  const submit = async event => { event.preventDefault(); setError(''); try {
    const profile = { ...form, hobbyMatrix: form.hobbies.split(',').map(x => x.trim()).filter(Boolean) };
    if (!supabase) { const body = registering ? profile : { email: form.email, password: form.password }; return onAuthenticated(await api(`/auth/${registering ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(body) })); }
    const result = registering ? await supabase.auth.signUp({ email: form.email, password: form.password }) : await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    if (result.error) throw result.error;
    if (!result.data.session) { setError('Check your email to confirm your account, then sign in.'); return; }
    const { user } = await api('/auth/bootstrap', { token: result.data.session.access_token, method: 'POST', body: JSON.stringify(profile) });
    onAuthenticated({ token: result.data.session.access_token, user, provider: 'supabase' });
  } catch (e) { setError(e.message); } };
  const providerName = supabase ? 'Supabase' : 'local development';
  return <main className="auth"><h1>Bengaluru VibeMatch</h1><p>Find a home that fits your rhythm. Secure login: {providerName}.</p><form onSubmit={submit}><h2>{registering ? 'Create your profile' : 'Welcome back'}</h2>{registering && <><input required placeholder="Name" value={form.name} onChange={e => setForm({...form, name:e.target.value})}/><input required placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})}/><select value={form.role} onChange={e => setForm({...form, role:e.target.value})}><option>Seeker</option><option>Host</option><option>Both</option></select><input placeholder="Profession" value={form.professionTitle} onChange={e => setForm({...form, professionTitle:e.target.value})}/><select value={form.workRoutine} onChange={e => setForm({...form, workRoutine:e.target.value})}><option>Fully Remote</option><option>Hybrid</option><option>Office Commute</option></select><input placeholder="Hobbies (comma-separated)" value={form.hobbies} onChange={e => setForm({...form, hobbies:e.target.value})}/></>}<input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email:e.target.value})}/><input required minLength="10" type="password" placeholder="Password (10+ characters)" value={form.password} onChange={e => setForm({...form, password:e.target.value})}/>{error && <p className="error">{error}</p>}<button>{registering ? 'Join VibeMatch' : 'Sign in'}</button></form><button className="link-button" onClick={() => setRegistering(!registering)}>{registering ? 'Already have an account? Sign in' : 'Need an account? Register'}</button></main>;
}
function ListingForm({ token, onCreated }) {
  const [form, setForm] = useState({ location: '', duration: 'Long-term (11+ months)', rent: '', deposit: '', maintenance: '', maidFee: '', wifiSplit: '', petFriendly: false, gatedSociety: false }); const [error, setError] = useState('');
  const update = e => setForm({ ...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async e => { e.preventDefault(); try { const { location, duration, rent, deposit, maintenance, maidFee, wifiSplit, petFriendly, gatedSociety } = form; const { listing } = await api('/listings', { token, method: 'POST', body: JSON.stringify({ location, duration, costs: { rent: Number(rent), deposit: Number(deposit), maintenance: Number(maintenance), maidFee: Number(maidFee), wifiSplit: Number(wifiSplit) }, propertyRules: { petFriendly, gatedSociety } }) }); onCreated(listing); } catch (e) { setError(e.message); } };
  return <form className="listing-form" onSubmit={submit}><h3>Post a listing</h3><input required name="location" placeholder="Location" onChange={update}/><select name="duration" value={form.duration} onChange={update}><option>Long-term (11+ months)</option><option>Short-term (1-6 months)</option><option>Flexible</option></select>{['rent','deposit','maintenance','maidFee','wifiSplit'].map(name => <input key={name} required={name === 'rent'} type="number" min="0" name={name} placeholder={name} value={form[name]} onChange={update}/>)}<label><input name="petFriendly" type="checkbox" onChange={update}/> Pet friendly</label><label><input name="gatedSociety" type="checkbox" onChange={update}/> Gated society</label>{error && <p className="error">{error}</p>}<button>Publish listing</button></form>;
}
export default function App() {
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem('vibematch-session')); } catch { return null; } }); const [listings, setListings] = useState([]); const [error, setError] = useState('');
  const loggedIn = data => { localStorage.setItem('vibematch-session', JSON.stringify(data)); setSession(data); };
  useEffect(() => { if (session) api('/listings', { token: session.token }).then(({listings}) => setListings(listings)).catch(e => setError(e.message)); }, [session]);
  if (!session) return <Auth onAuthenticated={loggedIn} />;
  const host = ['Host','Both'].includes(session.user.role);
  const signOut = () => { if (session.provider === 'supabase') supabase?.auth.signOut(); localStorage.removeItem('vibematch-session'); setSession(null); };
  return <main><header><h1>Bengaluru VibeMatch</h1><button onClick={signOut}>Sign out</button></header>{error && <p className="error">{error}</p>}{host && <ListingForm token={session.token} onCreated={listing => setListings(old => [{ ...listing, host: session.user }, ...old])}/>}<section><h2>Homes available now</h2><div className="grid">{listings.map(listing => <ListingCard key={listing._id} listing={listing} token={session.token} onRequestCreated={request => setListings(old => old.map(x => x._id === listing._id ? { ...x, myRequest: request } : x))}/>)}</div></section>{host && <HostReviewDashboard token={session.token}/>}</main>;
}
