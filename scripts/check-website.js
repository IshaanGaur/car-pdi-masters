// Stops a website deploy if the Razorpay payment page or the CMS safety fix is missing.
// Runs automatically before `firebase deploy` (see firebase.website.json "predeploy").
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const problems = [];
const need = (file, text, why) => { if (!read(file).includes(text)) problems.push(`${file}: missing ${why} (${text})`); };

need('payment.html', 'razorpayPayButton', 'the Razorpay "Continue to Secure Payment" button');
need('payment.html', '/payment.js', 'the payment script');
need('payment.html', 'checkout.razorpay.com', 'the Razorpay checkout script');
need('payment.js', 'cpmCreateBookingRazorpayOrderV1', 'the Razorpay order call');
need('site.js', 'sanitizeCmsNode', 'the CMS sanitising fix');
need('site.js', 'fillPreferredDates', 'the Preferred Date list filler');
need('site.js', 'ensureMobileMenu', 'the mobile menu button for every page');
need('site.js', 'const CMS_PAGE_OVERRIDES=false', 'GitHub-as-master for page content (old CMS copies must not replace pages)');
need('index.html', 'id="date"', 'the Preferred Date field on the booking form');
for (const f of ['site.js', 'payment.html', 'config/pricing.json']) {
  if (/9821097137|110317414950|CNRB0008598/.test(read(f))) problems.push(`${f}: still has the old manual UPI/bank details`);
}
// Every public page must use the Car PDI Masters number (99711 16411) for calls and WhatsApp.
const pages = [];
const walk = dir => {
  for (const e of fs.readdirSync(path.join(root, dir || '.'), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) { if (!/^(\.|_|functions$|node_modules$|scripts$)/.test(e.name)) walk(rel); }
    else if (e.name.endsWith('.html') && !e.name.includes('.backup-')) pages.push(rel);
  }
};
walk('');
for (const f of pages) {
  const html = read(f);
  for (const m of html.matchAll(/(?:wa\.me\/|tel:)\+?(\d+)/g)) {
    if (m[1].replace(/^91/, '') !== '9971116411') problems.push(`${f}: call/WhatsApp link uses ${m[1]} instead of 9971116411`);
  }
  if (/98765[\s-]?43210/.test(html)) problems.push(`${f}: shows the placeholder number 98765 43210`);
  // Every real page (not a redirect stub) must use the shared site design: logo header, menu, site styles and booking script.
  const isRedirect = /http-equiv="refresh"/i.test(html);
  if (!isRedirect) {
    const design = [
      ['<header class="nav">', 'the site header'],
      ['/assets/cpm-logo.png', 'the Car PDI Masters logo'],
      ['href="/style.css"', 'the site stylesheet'],
      ['src="/site.js"', 'the site script (menu, booking, pricing)'],
      ['nav class="links"', 'the site menu'],
      ['/cpm-icon-48.png', 'the site icon for Google (cpm-icon-48.png)'],
      ['<footer', 'the site footer'],
      ['footer-bottom', 'the footer bottom line (copyright)'],
      ['</html>', 'the end of the page (the file looks cut off)']
    ];
    for (const [text, why] of design) if (!html.includes(text)) problems.push(`${f}: missing ${why} - build new pages from an existing page such as locations/delhi/dwarka.html`);
    for (const m of html.matchAll(/<a\b[^>]*href="[^"]+\.pdf(?:\?[^"]*)?"[^>]*>/g)) {
      if (!/target="_blank"/.test(m[0])) problems.push(`${f}: a PDF link (e.g. the sample report) must open in a new tab (target="_blank")`);
    }
    if (/cdn\.tailwindcss\.com/.test(html)) problems.push(`${f}: is a stand-alone Tailwind page; use the site design instead`);
    for (const m of html.matchAll(/<a[^>]*href="https:\/\/wa\.me[^"]*"[^>]*>([\s\S]*?)<\/a>/g)) {
      if (/\bbook\b/i.test(m[1].replace(/<[^>]*>/g, ''))) problems.push(`${f}: a "Book" button opens WhatsApp; Book buttons must go to /#booking`);
    }
  }
}
// Google indexing: location pages must point to themselves, be indexable and carry valid breadcrumb data.
for (const f of pages.filter(p => p.startsWith('locations/'))) {
  const html = read(f);
  if (/http-equiv="refresh"/i.test(html)) continue;
  const url = `https://www.carmasters.co.in/${f}`;
  const canon = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(m => m[1]);
  if (canon.length !== 1 || canon[0] !== url) problems.push(`${f}: canonical must be exactly ${url} (found ${canon.join(', ') || 'none'})`);
  if (/<meta name="robots" content="[^"]*noindex/i.test(html)) problems.push(`${f}: location page is set to noindex`);
  if (!html.includes('"BreadcrumbList"')) problems.push(`${f}: missing breadcrumb data (BreadcrumbList)`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (_) { problems.push(`${f}: broken structured data (JSON-LD)`); }
  }
}
// Short addresses like /locations/delhi must forward to the real pages (Google reported a 404 on it).
if (!read('firebase.website.json').includes('"/locations/delhi"')) problems.push('firebase.website.json: missing the /locations/delhi -> /locations/delhi.html redirect');
// The payment page only works with a booking, so it stays out of Google and out of the sitemap.
if (!/<meta name="robots" content="noindex/.test(read('payment.html'))) problems.push('payment.html: must stay noindex (it is not a page for Google)');
const sitemap = read('sitemap.xml');
if (sitemap.includes('/payment.html')) problems.push('sitemap.xml: must not list payment.html');
for (const m of sitemap.matchAll(/<loc>https:\/\/www\.carmasters\.co\.in\/([^<]*)<\/loc>/g)) {
  const f = m[1] === '' ? 'index.html' : m[1];
  if (!fs.existsSync(path.join(root, f))) problems.push(`sitemap.xml: lists ${m[1]} but that page does not exist`);
  else if (/<meta name="robots" content="[^"]*noindex/i.test(read(f))) problems.push(`sitemap.xml: lists ${m[1]} but that page is noindex`);
}
for (const f of ['favicon.ico', 'cpm-icon-48.png', 'cpm-icon-96.png', 'cpm-icon-192.png', 'apple-touch-icon.png'])
  if (!fs.existsSync(path.join(root, f))) problems.push(`${f}: site icon file is missing`);
if (!read('index.html').includes('"@type":"WebSite"')) problems.push('index.html: missing the site name data for Google (WebSite)');
if (/SCAN &(amp;)?amp; PAY|SCAN & PAY/.test(read('payment.html'))) problems.push('payment.html: has the old QR-only "SCAN & PAY" page');

if (problems.length) {
  console.error('\nWEBSITE DEPLOY STOPPED - this folder has an old or incomplete website:\n  - ' + problems.join('\n  - '));
  console.error('\nRun `git pull` to get the latest version from GitHub, then deploy again. See DEPLOY-WEBSITE.md.\n');
  process.exit(1);
}
console.log('Website check passed: Razorpay payment page, booking date list and CMS fix are present.');
