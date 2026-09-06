import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import ApplicantProfileModal from './ApplicantProfileModal';
import ContactRevealModal from './ContactRevealModal';

export default function HostReviewDashboard({ token }) {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [contactRequest, setContactRequest] = useState(null);
  const [profileRequest, setProfileRequest] = useState(null);
  useEffect(() => { api('/requests/host', { token }).then(({ requests }) => setRequests(requests)).catch(e => setError(e.message)); }, [token]);
  const grouped = useMemo(() => requests.reduce((all, item) => {
    const key = item.listingId?._id || 'removed';
    (all[key] ||= { listing: item.listingId, applicants: [] }).applicants.push(item);
    return all;
  }, {}), [requests]);
  const respond = async (id, status) => {
    try {
      const { request } = await api(`/requests/${id}/respond`, { token, method: 'PATCH', body: JSON.stringify({ status }) });
      setRequests(old => old.map(x => x._id === id ? { ...x, ...request } : x));
      if (status === 'Accepted') setContactRequest(request);
    } catch (e) { setError(e.message); }
  };
  return <section><h2>Incoming applications</h2>{error && <p className="error">{error}</p>}
    {Object.values(grouped).map(({ listing, applicants }) => <section key={listing?._id}><h3>{listing?.location || 'Removed listing'}</h3>
      {applicants.map(item => { const p = item.seekerProfile || {}; const u = item.seekerId || {}; return <article className="applicant" key={item._id}>
        <h4>{u.professionTitle || 'Applicant'} · {u.workRoutine || 'Routine not shared'}</h4><p>{p.bio}</p><p>Hobbies: {(u.hobbyMatrix || []).join(', ') || 'Not specified'}</p><p>Move-in: {p.moveInTimeline ? new Date(p.moveInTimeline).toLocaleDateString() : 'Flexible'}</p><p>{item.introNote}</p>
        <button onClick={() => setProfileRequest(item)}>View applicant profile</button>
        {item.status === 'Pending' ? <><button onClick={() => respond(item._id, 'Accepted')}>Accept Profile</button><button onClick={() => respond(item._id, 'Rejected')}>Decline</button></> : <><strong>{item.status}</strong>{item.status === 'Accepted' && <button onClick={() => setContactRequest(item)}>View contact</button>}</>}
      </article>; })}
    </section>)}
    {profileRequest && <ApplicantProfileModal request={profileRequest} onClose={() => setProfileRequest(null)} />}
    {contactRequest && <ContactRevealModal requestId={contactRequest._id} token={token} onClose={() => setContactRequest(null)} />}
  </section>;
}
