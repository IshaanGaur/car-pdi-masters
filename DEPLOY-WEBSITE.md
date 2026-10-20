# Publishing the website (www.carmasters.co.in)

The website is published to Firebase Hosting (site `car-pdi-masters`).
GitHub (`IshaanGaur/car-pdi-masters`, branch `main`) is the one master copy.

## Every time

1. Get the latest version first:

   ```
   git pull
   ```

2. Publish the website only:

   ```
   firebase deploy --config firebase.website.json --only hosting:website --project car-pdi-masters
   ```

   Always include `--only hosting:website`. Without it Firebase would also try to publish the payment functions.

3. Open https://www.carmasters.co.in/payment.html and check the "Continue to Secure Payment" button is there.

## Rules

- Make changes on GitHub (or commit and push them there) before publishing. Never publish from an old folder, a backup copy or a ZIP download.
- Before every publish, `scripts/check-website.js` runs automatically. It stops the publish if the Razorpay payment page is missing or the old "SCAN & PAY" QR-only page is back. If it stops you, run `git pull` and try again. Don't edit the check to get past it.
- The admin site, Firestore rules and payment functions are published separately. This command doesn't touch them.

## Adding or changing pages

- Build every new page from an existing page with the same layout (for example copy `locations/delhi/dwarka.html` for a new area), so it keeps the logo header, menu, footer, `/style.css` and `/site.js`.
- "Book" buttons must go to `/#booking` (the website booking form). WhatsApp is only a secondary button.
- Calls and WhatsApp use 99711 16411 only.
- Stand-alone pages (for example Tailwind CDN pages) are blocked by the check.
- After each push, GitHub shows a green tick or red cross next to the commit ("Website check"). A red cross means the page will also be blocked from publishing; open it to see why.
