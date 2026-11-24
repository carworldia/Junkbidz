# JunkBidz (junkbidz.com): junk removal marketplace

Customers post a junk removal job. Approved junk removal companies whose service area covers the job's ZIP get it and send quotes. The customer compares prices, ratings and distance, chats in the app, and hires one. Then they mark the job done and leave a review.

Next.js 15 + Supabase (auth, Postgres + RLS, storage), deployed to Cloudflare Pages via `@cloudflare/next-on-pages`. Every page exports `runtime = "edge"`.

## Setup
1. Create a new Supabase project.
2. In `supabase/migrations/0005_admin.sql`, replace `owner@example.com` with your own email.
3. Supabase → SQL editor → run `supabase/migrations/0001` to `0005` in order, then the six files in `supabase/seed/` (US ZIP code locations used for distance).
4. `cp .env.example .env.local` and fill in the project URL and publishable key (or legacy anon key).
5. `npm install && npm run dev`
6. Supabase → Auth → URL Configuration: add your site URL as the Site URL / redirect.
7. Sign up with your admin email, confirm it, then run `0005_admin.sql` again (it switches admin on for confirmed allowlisted accounts).

Change the name, contact email and site address in `lib/site.ts` (and `public/manifest.webmanifest`).

## Deploy (Cloudflare Pages, direct upload)
```
npx wrangler login
npm run deploy:preview   # preview URL, leaves production alone
npm run deploy           # production
```
`NEXT_PUBLIC_*` vars are inlined at build time, so have `.env.local` in place when you build.

## Security model
- RLS on every table. Status changes (quotes, hiring, completing, reviews) only go through SECURITY DEFINER functions that check roles and turn order.
- A job is visible to its customer, approved companies whose area covers it (and who haul those items), and companies that quoted.
- The pickup address lives in `job_addresses`: only the customer and the hired company can read it.
- A company's phone is shown only to the customer who hired it. Emails are never shown.
- Company approval can never be set from the website; editing name, area or items sends it back to review.
- Admin is limited to allowlisted, confirmed emails and can only be granted in the SQL editor.
- Storage: one public `photos` bucket; each person can only write inside their own `<uid>/` folder.
