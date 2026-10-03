import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Users, X } from 'lucide-react';
import { api, usePoll } from '../api';

export default function Home() {
  const nav = useNavigate();
  const [services, setServices] = useState(null);
  const [pick, setPick] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const saved = localStorage.getItem('ticketId');

  usePoll(() => api('/services').then(setServices).catch((e) => setErr(e.message)), 6000);
  const totalWaiting = (services || []).reduce((a, s) => a + s.waiting, 0);

  async function join(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const t = await api('/tokens', { method: 'POST', body: { serviceId: pick.id, name, phone } });
      localStorage.setItem('ticketId', t.id);
      nav(`/ticket/${t.id}`);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }

  return (
    <main className="wrap">
      <section className="hero-card">
        <div>
          <span className="live"><i /> Live queues</span>
          <h1>Don't stand in line.<br />Hold your place from anywhere.</h1>
          <p>Pick a service, get a digital ticket, and watch your position and wait time update live.</p>
        </div>
        <div className="hero-stat"><b>{services ? totalWaiting : '–'}</b><span>people waiting right now</span></div>
      </section>

      {saved && <Link to={`/ticket/${saved}`} className="resume">You have an active ticket <span>View my ticket <ArrowRight size={15} /></span></Link>}
      {err && !pick && <p className="toast error">{err}</p>}

      <h2 className="section-title">Choose a service</h2>
      {!services ? <p className="muted">Loading queues…</p> : (
        <div className="services">
          {services.map((s) => (
            <button key={s.id} disabled={!s.isOpen} className="svc" onClick={() => { setPick(s); setErr(''); }}>
              <span className="prefix">{s.prefix}</span>
              <span className="svc-main">
                <strong>{s.name}</strong>
                {s.isOpen ? (
                  <small><span><Users size={13} /> {s.waiting} waiting</span><span><Clock size={13} /> ~{s.estimatedWaitForNewJoiner} min</span></small>
                ) : <small>Closed right now</small>}
              </span>
              <span className="serving">{s.nowServing ? <><small>Now serving</small><b>{s.nowServing}</b></> : s.isOpen ? <small>No one yet</small> : null}</span>
            </button>
          ))}
        </div>
      )}

      {pick && (
        <div className="sheet-back" onMouseDown={(e) => e.target === e.currentTarget && setPick(null)}>
          <form className="sheet" onSubmit={join}>
            <div className="row"><div><small className="muted">Joining</small><h3>{pick.name}</h3></div><button type="button" className="icon-btn" onClick={() => setPick(null)}><X size={18} /></button></div>
            <p className="sheet-eta"><Clock size={15} /> About <b>{pick.estimatedWaitForNewJoiner} min</b> wait · {pick.waiting} ahead of you</p>
            <label>Your name<input required autoFocus value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>Phone (optional)<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
            {err && <p className="form-error">{err}</p>}
            <button className="btn wide" disabled={busy}>{busy ? 'Getting ticket…' : 'Get my ticket'}</button>
          </form>
        </div>
      )}
    </main>
  );
}
