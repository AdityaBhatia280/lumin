# Project Lumin

Responsive informational website for the student-led initiative in Frisco, Texas.

## Preview and deployment
Run `node server.cjs` and open http://127.0.0.1:3000. Partners is at /partners.html.
Deploy index.html, partners.html, styles.css, app.js, assets-config.js, and assets/ to a static host. No build or dependencies are required.

## Configuration before launch
- The interest form verifies and saves name, email, category, and save time in browser localStorage. It never sends information to Project Lumin. Connect a real form endpoint or contact destination before using it to receive inquiries. Update the form disclosure, submission handler, and success text together. No newsletter service is connected or shown.
- The five supplied section visuals are configured in assets-config.js under images with descriptive alt text. All eight supplied PNGs are in assets/. Brand variants are listed under brand; the lockup is used in both page headers and footers, and the icon is the favicon. The wordmark is retained for future use. CSS hides transparent logo padding without modifying the originals.
- Partner grid entries are in the same configuration under partners. Add only names, logos, and confirmed relationships supplied by Project Lumin; each entry requires name, logo, and relationship. Optional url must use HTTPS. The grid is hidden while empty.
- The supplied official lockup replaces the previous header and footer logos.
- No social accounts, partners, achievements, team details, or contact addresses are invented.
- Google Fonts is optional; system fonts provide a fallback.

## Verification
JavaScript syntax validated. Static content, routes, sources, and removal of tracker/location code checked. Browser visual verification is unavailable in this session.

