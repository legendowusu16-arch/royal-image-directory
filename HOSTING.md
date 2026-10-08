# Publish and install the directory

The site is hosted on GitHub Pages and uses Supabase for its online database and administrator sign-in. The live app does not need XAMPP or the local computer to stay on.

**Live site:** https://legendowusu16-arch.github.io/royal-image-directory/

## Supabase setup

The Supabase project URL and public publishable key are configured in `site/supabase-config.js`. These browser-visible values can be in the public repository; never put a database password, `service_role` key, or other secret there.

The database was initialized in Supabase SQL Editor using `supabase/schema.sql`. It creates the protected tables and seeds all 22 department buttons, including the three Royal TV roles. Manager names, department contact details, staff, and department members start empty.

For an existing database, run [`supabase/add_department_contact_fields.sql`](./supabase/add_department_contact_fields.sql) and [`supabase/manage_directory_names.sql`](./supabase/manage_directory_names.sql) in Supabase SQL Editor. The first adds the email and phone fields; the second allows administrators to edit names, clear manager names, and delete staff, department members, and departments. Deleting a department also deletes its members. These one-time SQL steps are required for all hosted features. The three Royal TV role buttons are shown while the directory loads; after an administrator signs in, their records are added automatically. Alternatively, run [`supabase/add_royal_tv_departments.sql`](./supabase/add_royal_tv_departments.sql) in SQL Editor. New installations get these fields, permissions, and roles from `schema.sql`.

To allow a named administrator to edit:

1. In Supabase **Authentication → Sign In / Providers**, turn off public user sign-ups.
2. In **Authentication → Users**, invite the administrator's email address and have them accept the invite.
3. In SQL Editor, replace the example with the exact invited email and run:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@example.com'
   on conflict (user_id) do nothing;
   ```

   Check that one row was inserted. If it inserted zero rows, verify the invite was accepted and the email matches exactly. The administrator signs in on the live site without a password: click **Admin sign in**, enter the authorized email, click **Email me a sign-in link**, then open the newest email link. After returning to the directory, open **Admin tools** to see the department management list. Choose a department to edit its name, contact email and phone, change or clear its manager, and add, rename, or delete members. Visitors can tap the email or phone displayed in a department's details. The **All Staff** button opens staff name and role editing/deletion controls. Public sign-ups remain disabled, and only authorized administrator accounts can edit.

The chart and directory are public and searchable. Only the administrator account explicitly added to `admin_users` can change records; Supabase enforces this with row-level security. Do not store confidential staff information in these public tables.

## GitHub publishing and desktop install

The [GitHub repository](https://github.com/legendowusu16-arch/royal-image-directory) automatically deploys the `site/` directory to [the live app](https://legendowusu16-arch.github.io/royal-image-directory/). The PHP/MySQL files are not used for the hosted app. Push code changes to GitHub to update the site; database edits save directly in Supabase.

The legacy local XAMPP page (`index.php`) adds the three Royal TV roles to its MySQL database when it loads. Open a department button to edit its name, members, or delete the department; open **All Staff** to edit or delete staff. This legacy local page has no administrator sign-in, so use it only on a trusted local machine. The hosted app uses Supabase administrator sign-in instead.

Open the live HTTPS site in Chrome or Edge and choose **Install app** from the browser menu (or use **Install app** on the page when it appears). The desktop app uses the hosted service and needs an internet connection to fetch current directory data.

The deployment generates `robots.txt`, `sitemap.xml`, and a canonical URL. To help Google discover the site, add it to [Google Search Console](https://search.google.com/search-console), verify ownership, and submit `https://legendowusu16-arch.github.io/royal-image-directory/sitemap.xml`. Search engines may take time to index a new site; publishing does not guarantee a particular ranking.
