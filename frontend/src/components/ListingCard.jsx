import { useState } from 'react';
import { api } from '../api';
import ContactRevealModal from './ContactRevealModal';

export default function ListingCard({ listing, token, onRequestCreated }) {
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState(listing.myRequest || null);
  const [error, setError] = useState('');
  const [showContact, setShowContact] = useState(false);
  const costs = listing.costs;
  const monthly = (costs.rent || 0) + (costs.maintenance || 0) + (costs.maidFee || 0) + (costs.wifiSplit || 0);
  const sendInterest = async () => {
    try {
      const { request: created } = await api('/requests', { token, method: 'POST', body: JSON.stringify({ listingId: listing._id, introNote: note }) });
      setRequest(created); setOpen(false); onRequestCreated?.(created);
    } catch (e) { setError(e.message); }
  };
  const label = request?.status === 'Accepted' ? 'Connected' : request?.status === 'Rejected' ? 'Declined' : request ? 'Interested (Pending Review)' : null;
  return <article className="listing-card">
    {listing.media?.length > 0 && <div className="property-media">{listing.media.map((asset, index) => asset.type === 'video' ? <video key={asset.publicId} controls preload="metadata"><source src={asset.secureUrl} /></video> : <img key={asset.publicId} src={asset.secureUrl} alt={`Property view ${index + 1}`} loading="lazy" />)}</div>}
    <h3>{listing.proximity?.label || 'Bengaluru area'}</h3><p>{listing.duration}</p><p className="muted">Approximate area only — exact address is never shown.</p>{listing.distanceKm !== undefined && <p><strong>{listing.distanceKm} km direct</strong> · estimated road travel {listing.estimatedRoadKm} km</p>}{listing.description && <p>{listing.description}</p>}<p>Available from: {listing.availableFrom ? new Date(listing.availableFrom).toLocaleDateString() : 'Contact host'}</p>
    <dl><dt>Rent</dt><dd>₹{costs.rent}</dd><dt>Society / maintenance</dt><dd>₹{costs.maintenance || 0}</dd><dt>Maid</dt><dd>₹{costs.maidFee || 0}</dd><dt>WiFi</dt><dd>₹{costs.wifiSplit || 0}</dd><dt>Total monthly</dt><dd>₹{monthly}</dd></dl>
    <p>Deposit: ₹{costs.deposit || 0} · {listing.propertyRules.petFriendly ? 'Pet friendly' : 'No pets'} · {listing.propertyRules.gatedSociety ? 'Gated society' : 'Open access'}</p>
    <div>{(listing.host?.hobbyMatrix || []).map(hobby => <span className="tag" key={hobby}>{hobby}</span>)}</div>
    {label ? <><span className={`request-status ${request.status}`}>{label}</span>{request.status === 'Accepted' && <button onClick={() => setShowContact(true)}>View contact</button>}</> : <button onClick={() => setOpen(true)}>I&apos;m Interested</button>}
    {open && <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="modal"><h3>Introduce yourself</h3><textarea value={note} maxLength="1000" onChange={e => setNote(e.target.value)} placeholder="Optional note for the host" /><p className="error">{error}</p><button onClick={sendInterest}>Send interest</button><button onClick={() => setOpen(false)}>Cancel</button></section></div>}
    {showContact && <ContactRevealModal requestId={request._id} token={token} onClose={() => setShowContact(false)} />}
  </article>;
}
