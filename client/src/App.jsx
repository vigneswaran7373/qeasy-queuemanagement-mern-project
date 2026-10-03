import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { MonitorPlay, ShieldCheck, Ticket } from 'lucide-react';
import Home from './pages/Home.jsx';
import TicketPage from './pages/Ticket.jsx';
import Display from './pages/Display.jsx';
import { StaffLogin, StaffConsole } from './pages/Staff.jsx';

export default function App() {
  const onDisplay = useLocation().pathname === '/display';
  return (
    <>
      {!onDisplay && (
        <header className="nav">
          <Link to="/" className="brand"><span className="brand-mark"><Ticket size={18} /></span>Q<span>-</span>Easy</Link>
          <nav>
            <NavLink to="/" end><Ticket size={16} /> Join a queue</NavLink>
            <NavLink to="/display"><MonitorPlay size={16} /> Live board</NavLink>
            <NavLink to="/staff"><ShieldCheck size={16} /> Manager</NavLink>
          </nav>
        </header>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ticket/:id" element={<TicketPage />} />
        <Route path="/display" element={<Display />} />
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route path="/staff" element={<StaffConsole />} />
        <Route path="*" element={<p className="wrap">Page not found.</p>} />
      </Routes>
    </>
  );
}
