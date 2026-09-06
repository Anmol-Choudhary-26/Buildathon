import { useEffect, useState } from 'react';
import { api } from '../api';

export default function ContactRevealModal({ requestId, token, onClose }) {
  const [contact, setContact] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api(`/requests/${requestId}/contact`, { token }).then(({ contact }) => setContact(contact)).catch(e => setError(e.message)); }, [requestId, token]);
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="modal"><button aria-label="Close" onClick={onClose}>×</button><h2>Your connection</h2>{error && <p className="error">{error}</p>}{!contact && !error && <p>Unlocking contact…</p>}{contact && <><p>{contact.name}</p><p><a href={`tel:${contact.phone}`}>{contact.phone}</a></p><p><a href={`mailto:${contact.email}`}>{contact.email}</a></p><a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a></>}</section></div>;
}
