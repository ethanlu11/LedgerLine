# LedgerLine

Company spend by team, then by person, then by each person's subscriptions. Mock data only, with no bank integration.

Stack: Next.js (App Router) · TypeScript · Tailwind · **Postgres via Prisma 6**.

## Running it locally

You need a Postgres database. If you don't already have one, this repo ships a real Postgres that runs in userspace — no Docker, no system install:

```bash
cp .env.example .env
npm install
npm run db:start      # Postgres on :55432, data in .postgres/ — leave it running
```

Then in a second terminal:

```bash
npm run seed          # applies migrations, then fills the database
npm run dev           # http://localhost:3000
```

`npm run db:stop` shuts the database down. If you'd rather point at your own Postgres, skip `db:start` and set `DATABASE_URL` in `.env` to your own connection string.

Until you seed it, the pages render an empty state rather than erroring.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run build` | Applies migrations, then builds — this is what Vercel runs |
| `npm run seed` | Migrates, wipes, and reseeds the mock data |
| `npm run db:start` / `db:stop` | Local userspace Postgres |
| `npm run db:migrate` | Create a migration after editing `schema.prisma` |
| `npm run db:deploy` | Apply existing migrations (no schema drift) |
| `npm run db:studio` | Prisma Studio |
| `npm run typecheck` | `tsc --noEmit` |

`postinstall` runs `prisma generate`, so the client is always built after an install.

## Deploying to Vercel

1. **Provision Postgres** — Vercel Postgres, Neon, and Supabase all work.
2. **Set `DATABASE_URL`** in Project Settings → Environment Variables, for every environment you deploy.
3. **Deploy.** Vercel runs `npm install` (→ `postinstall` → `prisma generate`) then `npm run build`, which applies migrations with `prisma migrate deploy` before building.
4. **Seed once**, if you want the demo data: run `npm run seed` locally with `DATABASE_URL` pointed at the production database.

### Use a pooled connection string

Every request opens a database connection, and serverless functions scale out
independently — a direct connection will exhaust Postgres' connection limit
under load. Use the **pooled** host your provider gives you (Neon and Supabase
both expose one; Vercel Postgres pools by default). Keep the direct URL only for
running migrations.

### Note on `prisma migrate deploy` in the build

Migrations run at build time, which means a preview deployment migrates whatever database its `DATABASE_URL` points at. Give previews their own database if you don't want that.

## Pages

| Route | Shows |
| --- | --- |
| `/` | Teams: spend, headcount, dormant employees, category breakdown, unassigned spend |
| `/review` | Charges on shared cards that belong to nobody yet, grouped by vendor + card |
| `/data` | Two years of charges plotted: monthly spend, per-team trends, orphaned spend, top vendors, price drift |
| `/teams/[id]` | People in a team, with an All / Active / Departed filter (`?status=`) |
| `/people/[id]` | Cards and accounts, subscriptions table, filterable transactions (`?vendor=&category=&from=&to=`) |
| `/categories/[slug]` | One category broken down by team, vendor and person (`?team=` to scope) |

## Where the numbers come from

Every figure is derived from the `Charge` table in `src/lib/metrics.ts`. Nothing is stored or hardcoded. Amounts are integer cents, so sums are exact.

- **Ownership**: a charge belongs to a person, to a team, or to neither. Neither means it landed on a shared card and is waiting in Review.
- **Spend**: the sum of all charges, including one-off spend. "This month" is the calendar month to date, in UTC.
- **Subscription status**: *Active* if the last charge was within 35 days. *Orphaned* if it is still charging and its owner has left. *Cancelled* otherwise.
- **Total spent**: the sum of actual charges, never price × months.
- **Orphaned spend**: charged after a person's departure date, on subscriptions still being billed.
- Team totals plus unassigned spend equal the company total — the Teams table shows the unassigned line so the column reconciles.

## Seed data

`prisma/seed.ts` is deterministic (seeded PRNG) and all dates are relative to the day you run it, so re-run `npm run seed` if the data goes stale — after 35 days with no new charges everything reads as Cancelled.

It creates 4 teams, 20 people (4 departed), 85 subscriptions with 6–24 monthly charges each and several price changes, one-off travel and vendor spend, and 117 unassigned charges sitting on the four shared team cards. Three departed people still have live subscriptions; the fourth was offboarded cleanly.

Person avatars are generated into `public/avatars/` (DiceBear "Lorelei" by Lisa Wischofsky, CC0). That directory is gitignored and rebuilt by the seed.

## Theme

Dark by default, with a pull cord in the header that switches to light. The choice is stored in `localStorage` and applied before first paint. Chart colours are separately validated against each theme's surface.
