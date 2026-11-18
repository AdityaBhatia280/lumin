# Project Lumin preview

Run `node server.cjs` and open [the desktop preview](http://127.0.0.1:3000/). The preview uses static HTML, CSS, browser JavaScript, and Node. It requires no build step or dependency install.

To open it on a physical phone on the same Wi-Fi, start a separate preview with `$env:LUMEN_HOST='0.0.0.0'; $env:LUMEN_PORT='3001'; node server.cjs`, then open `http://<computer-Wi-Fi-IPv4>:3001/`. LAN access depends on the computer's firewall and network configuration.

## Update the preview

- `site-content.js` holds the title subtitle, updates, impact section, mission, draft goals, partners, project pages and galleries, Youth Ambassador Program, Digital Hub, contact email, and photo references and credits.
- `app.js` renders the pages, including the homepage photo wall arrangement.
- `styles.css` holds the layout, color, and motion. `index.html` contains the shared navigation.
- `assets/preview-*.jpg` are illustrative photographs. Source and credit records are stored in `site-content.js`.
- `network-data.js` retains the earlier imports for use when a project has an explicitly related location. The former standalone Network and Chapters URLs redirect to Our Work. Partner pages link directly to the organizations' websites.

The separate homepage impact section presents current focus areas and planned collaborations. Future participation and outreach figures can be added as they are documented. The contact buttons open a message to the existing Project Lumin email address.

Browser checks covered desktop, tablet, and phone layouts, including 320px and 1440px widths, together with the update links, mobile navigation, keyboard access, legacy redirects, and contact link.
