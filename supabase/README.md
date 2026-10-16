# Supabase Setup Guide for "Just You & Me 💗"

Follow these quick steps to set up your Supabase project in under 2 minutes:

## 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in or sign up.
2. Click **New Project**, choose an organization, give it a name (e.g. `just-you-and-me`), and select your preferred region.
3. Set a strong database password and click **Create new project**.

## 2. Run the Database Schema & RLS Policies
1. In your Supabase dashboard, click **SQL Editor** on the left navigation bar.
2. Click **+ New Query**.
3. Open [`supabase/schema.sql`](./schema.sql) in this repository and copy its entire content.
4. Paste the SQL code into the Supabase SQL editor and click **Run** (or press `Ctrl+Enter`).
5. You should see `Success. No rows returned`. All tables, RLS policies, trigger constraints, and storage bucket configuration are now active!

## 3. Enable Realtime Replication
The SQL script already adds `messages`, `watch_sessions`, `couple_spaces`, and `profiles` to the `supabase_realtime` publication.
To verify:
1. In Supabase Dashboard, go to **Database** -> **Replication**.
2. Confirm that the `supabase_realtime` source has these 4 tables enabled.

## 4. Confirm Storage Bucket
1. In Supabase Dashboard, go to **Storage**.
2. Confirm the `couple-media` bucket exists and has **Public bucket** set to `OFF` (Private).
3. The RLS policies in `schema.sql` automatically ensure that only members of each couple space can read or upload files under their `<couple_space_id>/` folder.

## 5. Get Your Project Credentials
1. Go to **Project Settings** -> **API**.
2. Copy the **Project URL** (`https://<project-ref>.supabase.co`).
3. Copy the **anon public** key (`eyJhbGciOi...`).
4. Paste these values into your `.env` file (or input them directly through the app's interactive setup banner in the browser):
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
