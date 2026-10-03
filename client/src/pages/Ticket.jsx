import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BellRing, CheckCircle2, Hourglass, XCircle } from 'lucide-react';
import { api, usePoll } from '../api';

const copy = {
  waiting: ['You are in the queue', Hourglass],
  serving: ["It's your turn — please go to the counter", BellRing],
  completed: ['All done. Thank you!', CheckCircle2],
  skipped: ['Your ticket was skipped. Please rejoin or ask at the desk.', XCircle],
  cancelled: ['Ticket cancelled', XCircle],
};

export default function Ticket() {
  const { id } = useParams();
  const [t, setT] = useState(null);
  const [err, setErr] = useState('');
  usePoll(() => api(`/tokens/${id}`).then((d) => { setT(d); setErr(''); }).catch((e) => setErr(e.message)), 5000, [id]);

  async function cancel() {
    if (!confirm('Give up your place in the queue?')) return;
    try { await api(`/tokens/${id}/cancel`, { method: 'PATCH' }); localStorage.removeItem('ticketId'); setT({ ...t, status: 'cancelled' }); }
    catch (e) { setErr(e.message); }
  }
  const finished = t && ['completed', 'skipped', 'cancelled'].includes(t.status);
  if (finished && localStorage.getItem('ticketId') === id) localStorage.removeItem('ticketId');

  const [text, Icon] = t ? copy[t.status] : [];
  const dots = t?.position ? Math.min(t.position, 8) : 0;

  return (
    <main className="wrap narrow">
      {err && <p className="toast error">{err}</p>}
      {!t && !err && <p className="muted">Loading…</p>}
      {t && (
        <div className={`stub ${t.status}`}>
          <div className="stub-top">
            <div><small>{t.service}</small><b>{t.name}</b></div>
            <span className="live"><i /> Live</span>
          </div>
          <div className="stub-cut"><i /><span /><i /></div>
          <div className="stub-body">
            <small className="muted">YOUR TICKET</small>
            <div className="big-label">{t.label}</div>
            <p className="state"><Icon size={20} /> {text}</p>
            {t.status === 'waiting' && (
              <>
                <div className="dots" aria-hidden>{Array.from({ length: dots }, (_, i) => <i key={i} className={i === dots - 1 ? 'you' : ''} />)}</div>
                <div className="facts">
                  <div><b>{t.position}</b><span>{t.position === 1 ? 'you are next' : 'position'}</span></div>
                  <div><b>~{t.estimatedWaitMinutes}</b><span>minutes</span></div>
                  <div><b>{t.nowServing || '—'}</b><span>now serving</span></div>
                </div>
                <button className="btn ghost" onClick={cancel}>Cancel my ticket</button>
              </>
            )}
            {finished && <Link className="btn" to="/">Back to queues</Link>}
            <p className="muted small">This page updates automatically every few seconds.</p>
          </div>
        </div>
      )}
    </main>
  );
}
