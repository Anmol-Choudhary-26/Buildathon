import { useEffect, useState } from 'react';
import { api } from '../api';

export default function MyListings({ token, onUpdated, onDeleted }) {
  const [listings, setListings] = useState([]); const [editing, setEditing] = useState(null); const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { listings } = await api('/listings/mine', { token });
        if (active) setListings(listings);
      } catch (e) { if (active) setError(e.message); }
    };
    load();
    return () => { active = false; };
  }, [token]);
  const save = async event => { event.preventDefault(); try { const id = editing._id; const payload = { ...editing, costs: { rent: Number(editing.costs.rent), deposit: Number(editing.costs.deposit || 0), maintenance: Number(editing.costs.maintenance || 0), maidFee: Number(editing.costs.maidFee || 0), wifiSplit: Number(editing.costs.wifiSplit || 0) } }; delete payload._id; delete payload.hostId; delete payload.createdAt; delete payload.updatedAt; delete payload.__v; const { listing } = await api(`/listings/${id}`, { token, method: 'PATCH', body: JSON.stringify(payload) }); setListings(old => old.map(x => x._id === id ? listing : x)); setEditing(null); onUpdated?.(listing); } catch (e) { setError(e.message); } };
  const remove = async id => { if (!window.confirm('Delete this property and its pending applications?')) return; try { await api(`/listings/${id}`, { token, method: 'DELETE' }); setListings(old => old.filter(x => x._id !== id)); onDeleted?.(id); } catch (e) { setError(e.message); } };
  return <section><h2>My posted properties</h2>{error && <p className="error">{error}</p>}{listings.map(listing => <article className="applicant" key={listing._id}><h3>{listing.location}</h3><p>{listing.status} · Available from {listing.availableFrom ? new Date(listing.availableFrom).toLocaleDateString() : 'Not set'}</p><p>{listing.description || 'No description'}</p><button onClick={() => setEditing(structuredClone(listing))}>Edit</button><button onClick={() => remove(listing._id)}>Delete</button></article>)}{editing && <div className="modal-backdrop" role="dialog" aria-modal="true"><form className="modal" onSubmit={save}><button type="button" aria-label="Close edit" onClick={() => setEditing(null)}>×</button><h2>Edit property</h2><input required value={editing.location} onChange={e => setEditing({ ...editing, location: e.target.value })} placeholder="Neighbourhood"/><textarea required maxLength="2000" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Description"/><label>Available from<input required type="date" value={editing.availableFrom ? editing.availableFrom.slice(0, 10) : ''} onChange={e => setEditing({ ...editing, availableFrom: e.target.value })}/></label><label>Status<select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}><option>Available</option><option>Filled</option></select></label>{['rent','deposit','maintenance','maidFee','wifiSplit'].map(key => <input key={key} type="number" min="0" value={editing.costs?.[key] || ''} onChange={e => setEditing({ ...editing, costs: { ...editing.costs, [key]: e.target.value } })} placeholder={key}/>) }<button>Save changes</button></form></div>}</section>;
}
