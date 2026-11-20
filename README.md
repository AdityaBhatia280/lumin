# Project Lumin website

Run `node server.cjs`, then open http://127.0.0.1:3000/ for the site and **http://127.0.0.1:3000/admin** for the admin panel.
Phone preview on the same Wi-Fi: `$env:LUMEN_HOST='0.0.0.0'; $env:LUMEN_PORT='3001'; node server.cjs`, then open `http://<computer-IP>:3001/`.

## Admin panel
- **Live site:** go to `<your domain>/admin` and log in with the admin password. Edit anything, then press **Publish changes** (or Ctrl+S). It saves to GitHub as one commit and Vercel updates the site in about a minute.
- **Your computer:** run `node server.cjs` and open http://127.0.0.1:3000/admin (no password; it only opens on this computer). **Save changes** writes into the project folder.

Tabs: **Photos** (bulk upload, shuffled across the site), **Photo spots** (pin a photo to a place or leave it random), **Blog**, **Partners** (logos, order, up to 3 featured), **Settings** (email, Instagram).

### One-time setup for the live admin (Vercel)
1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token. Repository access: **Only select repositories → lumin**. Permissions: **Contents → Read and write**. Copy the token.
2. Vercel → the project → Settings → **Environment Variables**: add `ADMIN_PASSWORD` (a long password) and `GITHUB_TOKEN` (the token). Then Deployments → ⋯ → **Redeploy**.
3. The live admin commits to GitHub, so run `git pull` before editing files on your computer.

## Files
- `data/site-data.js` – photos, photo spots, partners, blog posts, email and Instagram (written by the admin panel).
- `site-content.js` – site text: mission, focus areas, who we serve.
- `network-data.js` – schools and communities shown on the Impact page map and directory.
- `app.js` renders the pages, `styles.css` holds the design (brand colors: navy #16326d, gold #f4a730, off-white #fff9f3).
- `assets/brand/` – logo files. `assets/uploads/` – photos and logos added through the admin panel.
- `api/` – the live admin backend (login, upload, publish) that runs on Vercel.
- `admin.html` / `admin.js` – the admin panel. `server.cjs` – local preview server.
- `vercel.json` – routing for Vercel. (`_redirects` is for Netlify, where the live admin isn't supported.)
