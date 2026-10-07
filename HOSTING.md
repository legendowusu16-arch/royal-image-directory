# Publish and install the directory

The site is hosted on GitHub Pages and uses Supabase for its online database and administrator sign-in. The live app does not need XAMPP or the local computer to stay on.

**Live site:** https://legendowusu16-arch.github.io/royal-image-directory/

## Supabase setup

The Supabase project URL and public publishable key are configured in `site/supabase-config.js`. These browser-visible values can be in the public repository; never put a database password, `service_role` key, or other secret there.

The database was initialized in Supabase SQL Editor using `supabase/schema.sql`. It creates the protected tables and seeds all 19 department buttons from the original chart. Manager names, staff, and department members start empty.

To allow a named administrator to edit:

1. In Supabase **Authentication → Sign In / Providers**, turn off public user sign-ups.
2. In **Authentication → Users**, invite the administrator's email address and have them accept the invite.
3. In SQL Editor, replace the example with the exact invited email and run:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@example.com'
   on conflict (user_id) do nothing;
   ```

   Check that one row was inserted. If it inserted zero rows, verify the invite was accepted and the email matches exactly. The administrator can then sign in on the live site to add staff, members, and manager names.

The chart and directory are public and searchable. Only the administrator account explicitly added to `admin_users` can change records; Supabase enforces this with row-level security. Do not store confidential staff information in these public tables.

## GitHub publishing and desktop install

The [GitHub repository](https://github.com/legendowusu16-arch/royal-image-directory) automatically deploys the `site/` directory to [the live app](https://legendowusu16-arch.github.io/royal-image-directory/). The PHP/MySQL files are not used for the hosted app. Push code changes to GitHub to update the site; database edits save directly in Supabase.

Open the live HTTPS site in Chrome or Edge and choose **Install app** from the browser menu (or use **Install app** on the page when it appears). The desktop app uses the hosted service and needs an internet connection to fetch current directory data.

The deployment generates `robots.txt`, `sitemap.xml`, and a canonical URL. To help Google discover the site, add it to [Google Search Console](https://search.google.com/search-console), verify ownership, and submit `https://legendowusu16-arch.github.io/royal-image-directory/sitemap.xml`. Search engines may take time to index a new site; publishing does not guarantee a particular ranking.
