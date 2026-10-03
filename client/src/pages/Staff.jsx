import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BellRing, CheckCheck, Lock, LogOut, Phone, Plus, Unlock, UserX } from 'lucide-react';
import { api, usePoll } from '../api';

export function StaffLogin() {
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault(); setErr('');
    try { const d = await api('/admin/login', { method: 'POST', body: f }); localStorage.setItem('staffToken', d.token); nav('/staff'); }
    catch (x) { setErr(x.message); }
  }
  return (
    <main className="wrap narrow">
      <div className="login-card">
        <span className="login-icon"><Lock size={22} /></span>
        <h2>Manager login</h2>
        <p className="muted">Sign in to run the counter.</p>
      <form onSubmit={submit}>
        <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        {err && <p className="form-error">{err}</p>}
        <button className="btn wide">Log in</button>
      </form>
      </div>
    </main>
  );
}

export function StaffConsole() {
  const nav = useNavigate();
  const [services, setServices] = useState([]);
  const [sel, setSel] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [newSvc, setNewSvc] = useState({ name: '', prefix: '', avgServiceMinutes: 5 });
  const authed = !!localStorage.getItem('staffToken');

  const loadServices = () => api('/services').then((s) => { setServices(s); if (!sel && s[0]) setSel(s[0].id); });
  useEffect(() => { if (authed) loadServices().catch((e) => setErr(e.message)); }, []);
  const loadQueue = () => sel && api(`/admin/services/${sel}/queue`, { auth: true }).then((d) => { setData(d); setErr(''); })
    .catch((e) => { if (e.status === 401) { localStorage.removeItem('staffToken'); nav('/staff/login'); } else setErr(e.message); });
  usePoll(loadQueue, 4000, [sel]);

  if (!authed) return <Navigate to="/staff/login" replace />;

  const act = async (path, method = 'POST') => {
    try { await api(`/admin/services/${sel}/${path}`, { method, auth: true }); await loadQueue(); await loadServices(); }
    catch (e) { setErr(e.message); }
  };
  async function addService(e) {
    e.preventDefault();
    try { await api('/admin/services', { method: 'POST', auth: true, body: { ...newSvc, avgServiceMinutes: +newSvc.avgServiceMinutes } }); setNewSvc({ name: '', prefix: '', avgServiceMinutes: 5 }); loadServices(); }
    catch (x) { setErr(x.message); }
  }

  return (
    <main className="wrap wide">
      <header className="page-head">
        <div><h1>Manager console</h1><p className="muted">Call customers, keep the queue moving, watch today's numbers.</p></div>
        <button className="btn ghost" onClick={() => { localStorage.removeItem('staffToken'); nav('/staff/login'); }}><LogOut size={16} /> Log out</button>
      </header>
      {err && <p className="toast error">{err}</p>}
      <div className="tabs">
        {services.map((s) => <button key={s.id} className={`tab ${sel === s.id ? 'on' : ''}`} onClick={() => setSel(s.id)}><b>{s.prefix}</b> {s.name}{s.waiting > 0 && <span className="count">{s.waiting}</span>}</button>)}
      </div>

      {data && (
        <>
          <div className="console">
            <section className="serving-card">
              <small>NOW SERVING</small>
              <div className="big-label">{data.serving ? data.serving.label : '—'}</div>
              <p>{data.serving ? data.serving.customerName : 'Nobody at the counter'}</p>
              <div className="actions">
                <button className="btn big" disabled={data.waiting.length === 0 && !data.serving} onClick={() => act('next')}>
                  <BellRing size={18} /> {data.serving ? 'Complete & call next' : 'Call next'}
                </button>
                <button className="btn glass" disabled={!data.serving} onClick={() => act('skip')}><UserX size={16} /> No-show</button>
                <button className="btn glass" disabled={!data.serving} onClick={() => act('complete')}><CheckCheck size={16} /> Complete only</button>
              </div>
            </section>
            <section className="card">
              <h3>Today</h3>
              <div className="stat-grid">
                <div><b>{data.stats.total}</b><span>issued</span></div>
                <div><b>{data.stats.completed}</b><span>served</span></div>
                <div><b>{data.stats.skipped}</b><span>no-shows</span></div>
                <div><b>{data.stats.cancelled}</b><span>cancelled</span></div>
                <div><b>{data.stats.avgHandleMinutes ?? '—'}</b><span>avg min / customer</span></div>
                <div><b>{data.service.avgServiceMinutes}</b><span>min used for ETA</span></div>
              </div>
              <button className="btn ghost wide" onClick={() => act('toggle', 'PATCH')}>
                {data.service.isOpen ? <><Lock size={15} /> Close this queue</> : <><Unlock size={15} /> Reopen this queue</>}
              </button>
            </section>
          </div>

          <h2 className="section-title">Waiting ({data.waiting.length})</h2>
          <div className="wait-list">
            {data.waiting.length === 0 && <p className="empty">No one is waiting.</p>}
            {data.waiting.map((t, i) => (
              <div className="wait-row" key={t._id}>
                <span className="pos">{i + 1}</span><b className="lbl">{t.label}</b><span>{t.customerName}</span>
                <span className="muted small">{t.phone && <><Phone size={12} /> {t.phone}</>}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">Add a service</h2>
      <form className="card add-form" onSubmit={addService}>
        <input required placeholder="Service name" value={newSvc.name} onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })} />
        <input required maxLength="2" placeholder="Letter (e.g. C)" value={newSvc.prefix} onChange={(e) => setNewSvc({ ...newSvc, prefix: e.target.value })} />
        <input type="number" min="1" placeholder="Avg minutes" value={newSvc.avgServiceMinutes} onChange={(e) => setNewSvc({ ...newSvc, avgServiceMinutes: e.target.value })} />
        <button className="btn"><Plus size={16} /> Add</button>
      </form>
    </main>
  );
}
