# حصالتي — Setup Guide (do this once)

Your site: **https://hsalati.vercel.app**

## Step 1 — Supabase keys (Vercel)

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) → your project  
2. **Settings → API** — copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key (secret) → `SUPABASE_SERVICE_ROLE_KEY`  
   ⚠️ Use **service_role**, NOT the anon key.

3. Open [vercel.com/dashboard](https://vercel.com/dashboard) → **hsalati** project  
4. **Settings → Environment Variables** — add or update:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service_role) |
| `ADMIN_USERNAME` | `Alqabbani` |
| `ADMIN_PASSWORD` | your admin password |
| `JWT_SECRET` | any long random string |

5. **Deployments → Redeploy** (check "Use existing Build Cache" OFF)

---

## Step 2 — Create database tables

1. Log in: **https://hsalati.vercel.app/login.html**  
   - Username: `Alqabbani`  
   - Password: (your admin password)

2. Open **Admin panel** → if database is not ready, you'll see **Database setup**  
3. Click **Copy SQL**  
4. Open [Supabase SQL Editor](https://supabase.com/dashboard) → **SQL → New query**  
5. Paste → **Run**

6. Back in Admin → click **Check connection** — should show green ✅

---

## Step 3 — Done!

- Plans: https://hsalati.vercel.app/challenge.html  
- Dashboard: https://hsalati.vercel.app/dashboard.html  

---

## Optional — run schema from your PC

Add to `.env`:

```
SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Get URI from Supabase → Settings → Database → Connection string.

Then run:

```bash
npm run setup:schema
```
