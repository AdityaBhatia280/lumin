# Project Lumin website

Run `node server.cjs`, then open http://127.0.0.1:3000/ for the site and **http://127.0.0.1:3000/admin** for the admin panel.
Phone preview on the same Wi-Fi: `$env:LUMEN_HOST='0.0.0.0'; $env:LUMEN_PORT='3001'; node server.cjs`, then open `http://<computer-IP>:3001/`.

## Admin panel (`/admin`)
Only opens on the computer running the server. Every change saves automatically into the project.
- **Photos** – drop in as many photos as you like (they're resized automatically). They get shuffled across the whole site; untick "In moving wall" to keep one off the homepage wall.
- **Photo spots** – every place a photo appears. Pin a specific photo or leave it on Random.
- **Blog** – add, edit, reorder and delete posts. The top three show on the homepage.
- **Partners** – add partners, upload logos, set the order (biggest first) and choose up to 3 featured partners for the homepage.
- **Settings** – contact email and Instagram link.

To publish admin changes to the live site, commit and push to GitHub (`data/site-data.js` and `assets/uploads/`).

## Files
- `data/site-data.js` – photos, photo spots, partners, blog posts, email and Instagram (written by the admin panel).
- `site-content.js` – site text: mission, focus areas, who we serve.
- `network-data.js` – schools and communities shown on the Impact page map and directory.
- `app.js` renders the pages, `styles.css` holds the design (brand colors: navy #16326d, gold #f4a730, off-white #fff9f3).
- `vercel.json` / `_redirects` – routing for Vercel or Netlify hosting. The admin panel isn't deployed.
