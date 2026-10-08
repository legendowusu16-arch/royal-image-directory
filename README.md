# Royal Image Group Directory

Public organizational chart and staff directory, published as an installable Progressive Web App (PWA).

- **Live site:** [Royal Image Group Directory](https://legendowusu16-arch.github.io/royal-image-directory/)
- **Website:** GitHub Pages serves the static files in [`site/`](./site/).
- **Data and administrator sign-in:** Supabase, protected with PostgreSQL row-level security.
- **Admin login:** Email and password for explicitly authorized administrator accounts.
- **Desktop install:** Open the deployed HTTPS site in Chrome or Edge and choose **Install desktop app**.
- **Deployment and setup:** Follow [`HOSTING.md`](./HOSTING.md).

The public directory data is intentionally blank until an administrator adds departments and staff. Directory records are publicly readable; only authorized administrator accounts can change them. Do not store confidential information in the directory.

The GitHub Pages workflow publishes only `site/` and copies its logo and icon assets from the project folders. The legacy PHP files are not part of the deployed site. Local XAMPP is not needed to use the hosted app.
