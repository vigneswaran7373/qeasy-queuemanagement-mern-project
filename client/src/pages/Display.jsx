import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, usePoll } from '../api';

export default function Display() {
  const [services, setServices] = useState([]);
  const [now, setNow] = useState(new Date());
  usePoll(() => { api('/services').then(setServices).catch(() => {}); setNow(new Date()); }, 4000);

  return (
    <main className="board">
      <div className="board-top">
        <h1>Now serving</h1>
        <span>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · <Link to="/">exit</Link></span>
      </div>
      <div className="board-grid">
        {services.map((s) => (
          <section key={s.id} className={`board-card ${s.nowServing ? 'active' : ''}`}>
            <h2><span>{s.prefix}</span> {s.name}</h2>
            <div className="board-num">{s.nowServing || '—'}</div>
            <p>{s.isOpen ? `${s.waiting} waiting · ~${s.estimatedWaitForNewJoiner} min` : 'Closed'}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
