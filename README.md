
# FlatSplit

Shared flat-expense tracker: create a flat, invite roommates, open a "book" (an
expense period), log expenses with category/remarks/split, watch live balances,
then close the book to get the minimum set of payments needed to settle up
(e.g. "A pays C ₹250" instead of everyone paying everyone).

## Structure

- `backend/` — Node.js + Express + MySQL (via Prisma) REST API
- `mobile/` — React Native (Expo) app

## Backend setup

1. Install MySQL locally (or use a hosted instance) and create a database:
   ```sql
   CREATE DATABASE flatsplit;
   ```
2. `cd backend`
3. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (with your MySQL
   user/password) and a random `JWT_SECRET`.
4. Install deps and run the migration:
   ```
   npm install
   npx prisma migrate dev --name init
   ```
5. Start the API:
   ```
   npm run dev
   ```
   It listens on `http://localhost:4000` (health check: `GET /health`).

## Mobile setup

1. `cd mobile`
2. In `src/api/client.ts`, set `API_BASE_URL` to your machine's LAN IP (e.g.
   `http://192.168.1.20:4000`) — `localhost` won't resolve from a phone or
   emulator. Find your IP with `ipconfig` (Windows).
3. Install deps (already done if you just cloned this) and start Expo:
   ```
   npm install
   npm start
   ```
4. Scan the QR code with **Expo Go** (iOS/Android) to run it on your phone, or
   press `a` / `i` for an emulator.

## Core flow

1. Register / log in.
2. Create a flat (or join one with an invite code) — creator becomes admin.
3. Inside a flat, create a **book** (e.g. "July Groceries").
4. Add expenses to the book: amount, category, remarks, who paid, and how it's
   split (equally or custom amounts) among selected members.
5. View live running balances any time the book is open.
6. Close the book to lock it and generate the final settlement — the minimum
   number of "X pays Y" transactions. Either party can mark a transaction as
   paid once settled in real life.
7. Multiple books can be open in a flat at once; closed books stay in the
   flat's history.

## What's implemented vs. suggested next

Implemented: multi-flat support, invite-code joining, admin role (remove
members), multiple concurrent books, equal/exact-amount splitting, live
balances, debt-simplification on close, settlement pay-tracking, session
persistence (`/auth/me`).

Reasonable next additions (not built yet, kept out to avoid over-building
before you've used the MVP): percentage-based splits (backend already
supports it, just needs a UI), receipt photo attachments, push notifications
(new expense / payment reminders — FCM), recurring expenses (e.g. monthly
rent), CSV/PDF export of a closed book, offline queueing for spotty wifi.
