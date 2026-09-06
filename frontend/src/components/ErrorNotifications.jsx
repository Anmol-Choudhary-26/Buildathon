import { useEffect, useState } from 'react';

export default function ErrorNotifications() {
  const [notices, setNotices] = useState([]);
  useEffect(() => {
    const onError = event => {
      const notice = { id: crypto.randomUUID(), message: event.detail || 'Something went wrong. Please try again.' };
      setNotices(current => [...current, notice]);
      window.setTimeout(() => setNotices(current => current.filter(item => item.id !== notice.id)), 6000);
    };
    window.addEventListener('vibematch:error', onError);
    return () => window.removeEventListener('vibematch:error', onError);
  }, []);
  return <div className="toast-region" role="region" aria-live="assertive" aria-label="Error notifications">{notices.map(notice => <div className="error-toast" role="alert" key={notice.id}><span>{notice.message}</span><button aria-label="Dismiss error" onClick={() => setNotices(current => current.filter(item => item.id !== notice.id))}>×</button></div>)}</div>;
}
