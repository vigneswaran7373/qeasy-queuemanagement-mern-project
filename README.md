# Q-Easy – Smart Queue Management System (MERN)

Customers take a digital ticket from their phone, watch their position and estimated wait update live, and walk up when called. Staff run the counter from a console; a big-screen board shows who is being served.

**Stack:** MongoDB · Express.js · React (Vite) · Node.js · JWT (staff) · REST APIs

## Features
- Multiple services/queues, each with its own letter prefix (G-001, B-014 …)
- Atomic, gap-free token numbers that reset every day (per-service counter document)
- Live ticket page (auto-refresh every 5 s): position, estimated wait, "now serving"
- **Automation:** estimated wait self-calibrates – each completed customer updates the service's average time with a moving average, and stale tickets from previous days are auto-closed by a background sweep
- Manager console: call next (auto-completes the current customer), no-show, complete, open/close queue, add services, today's stats
- `/display` live board for a TV or lobby screen

## Run it
Requires Node 18+ and MongoDB.

```bash
cd server
cp .env.example .env
npm install
npm run seed        # demo services + staff user
npm run dev         # http://localhost:5001

cd ../client        # new terminal
npm install
npm run dev         # http://localhost:5174
```

Manager login: `manager@qeasy.com` / `password123` (open `/staff`, or the **Manager** link in the navbar).

## Tests
```bash
cd server && npm test      # 11 API tests (needs MongoDB; uses a separate `qeasy_test` database that it wipes)
```
Covers login/route protection, gap-free numbering under 10 concurrent joins, ETA maths, the moving-average learning, a race test (4 simultaneous "call next" clicks never serve two people), open/close, and the stale-ticket sweep.

## REST API
| Method | Route | Access |
|---|---|---|
| GET | /api/services | public |
| POST | /api/tokens `{serviceId,name,phone}` | public |
| GET | /api/tokens/:id | public |
| PATCH | /api/tokens/:id/cancel | public |
| POST | /api/admin/login | staff |
| GET | /api/admin/services/:id/queue | staff |
| POST | /api/admin/services/:id/next · complete · skip | staff |
| PATCH | /api/admin/services/:id/toggle | staff |
| POST | /api/admin/services | staff |
