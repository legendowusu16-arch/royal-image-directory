# Publish and install the directory

This project publishes its static PWA from `site/` using GitHub Pages. Supabase supplies the online database and administrator sign-in. The GitHub Pages workflow publishes only `site/`; the legacy PHP files are not deployed. Once published, the live app does not need XAMPP or the local computer to stay on.

The directory data is intentionally blank for the cloud setup. Department, staff, and member records can be added after an administrator signs in.

## 1. Create the Supabase project

1. Create a Supabase project and save its database password somewhere private.
2. Open **SQL Editor**, run the contents of [`supabase/schema.sql`](./supabase/schema.sql), and wait for it to finish. This creates the blank tables and row-level security rules.
3. In **Authentication** settings, turn off public sign-ups. Invite the administrator's email address from the Supabase dashboard and set a password.
4. In SQL Editor, authorize that invited account. Replace the email with the exact invited address:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@example.com'
   on conflict (user_id) do nothing;
   ```

   Check that one row was inserted. If it inserted zero rows, verify the email is confirmed and spelled exactly as invited.
5. Open **Project Settings → API**. Copy the project URL and the publishable key (or legacy `anon` key) into `site/supabase-config.js`:

   ```js
   export const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
   export const SUPABASE_ANON_KEY = 'YOUR-PUBLISHABLE-OR-ANON-KEY';
   ```

   These are browser-visible values. Never put the database password, `service_role` key, or another secret in this file or in GitHub Pages.

The directory tables are readable by everyone, as required for a public chart and search engines. Only the invited user IDs listed in `admin_users` can change records; row-level security enforces this in the database, not just in the page. Do not store confidential staff data in these public tables.

## 2. Publish from GitHub

1. Create a **public** GitHub repository for this project. GitHub Pages is free for public repositories. Keep the existing project files at the repository root.
2. Upload/push `.github/workflows/pages.yml`, `site/`, `supabase/`, and `pic/`/`icons/` assets to the repository root. You may include the legacy PHP source for reference, but it is not needed for the Pages site. Never commit database passwords, Supabase service-role keys, or other secrets.
3. In the repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.
4. Check the **Actions** tab and wait for **Deploy Royal Image PWA** to complete. The live address will be:
   - `https://YOUR-USERNAME.github.io/` if the repository is named `YOUR-USERNAME.github.io`
   - `https://YOUR-USERNAME.github.io/REPOSITORY/` for a project repository
5. In Supabase **Authentication → URL Configuration**, set the Site URL to the live address and add that exact address as a redirect URL.
6. Open the live HTTPS address and test administrator sign-in, creating a department, adding staff, search, and sign-out.

The workflow generates `robots.txt`, `sitemap.xml`, and a canonical URL for the repository's GitHub Pages address. To help people find it through Google, add the public site to [Google Search Console](https://search.google.com/search-console), verify ownership, and submit `/sitemap.xml`. Search engines may take days or weeks to index a new site; being deployed does not guarantee a particular search ranking.

## 3. Install it on a desktop

Open the live HTTPS site in a current version of Chrome or Edge. Select **Install desktop app** when it appears, or use the browser menu's **Install app** option. The installed app opens separately from the browser. Keep an internet connection for current chart data, sign-in, and changes; the PWA caches its shell and branding, not private login sessions or database results.

Changes pushed to the repository are published automatically. Directory edits are saved immediately in Supabase and do not require a GitHub update or XAMPP.
