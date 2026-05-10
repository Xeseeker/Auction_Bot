# Telegram Auction

Telegram Auction is a full-stack auction platform built around a Telegram bot and a React admin dashboard.

## What Is Included

- `backend/` - Express API, Telegram bot handlers, MongoDB models, Socket.IO live updates, auction lifecycle jobs.
- `frontend/` - Vite React admin dashboard for moderation, auction review, user management, and reporting.

## Requirements

- Node.js 20 or newer
- MongoDB
- Telegram bot token
- Telegram channel where approved auctions are posted

## Backend Setup

```bash
cd backend
npm install
npm start
```

The backend reads environment variables from `.env` in either the repo root or `backend/`.

Required production variables:

- `BOT_TOKEN`
- `CHANNEL_ID`
- `MONGO_URI`
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The admin panel is served at `/admin/` in production and through Vite during local development.

## Common Commands

```bash
cd backend && npm start
cd frontend && npm run dev
cd frontend && npm run build
```

## Main Features

- Seller approval workflow
- Pending auction review
- Standard, Dutch, sealed-bid, and reverse auctions
- Buy-now flow for standard auctions
- Watchlist notifications
- Admin dashboard with live Socket.IO refreshes
- User moderation and ban controls
- Auction status and bid reporting

## Development Notes

- Keep backend behavior changes covered by service-level tests.
- Keep admin UI changes responsive for desktop and mobile widths.
- Prefer small commits that each complete one focused task.
- Do not commit `.env`, build output, or `node_modules`.
