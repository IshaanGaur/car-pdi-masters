// Build-time title/description overrides for SEO.
// Search Console data (Nov 2026) showed /services/new-car-pdi.html gets its impressions for
// "pdi service in delhi" style queries, so its title/description now say "PDI Service in Delhi NCR".
// Runs from firebase.website.json "predeploy", AFTER scripts/enhance-seo-pages.js.
// To tune another page later, add an entry to OVERRIDES (key = file path from the site root).
// Each page keeps exactly ONE <title> and ONE meta description (scripts/check-website.js enforces this).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const OVERRIDES = {
  'services/new-car-pdi.html': {
    title: 'New Car PDI | PDI for New Car in Delhi NCR | 300+ Checks',
    description: 'Book a new car PDI in Delhi NCR before delivery. PDI for new car with 300+ checks, paint thickness readings and a photo-supported report from ₹1,499.'
  },
  'services/used-car-inspection.html': {
    title: 'Used Car Inspection in Delhi | 300+ Checks | Car PDI Masters',
    description: 'Book a used car inspection in Delhi before buying. Get 300+ checks for body, paint, tyres, interior and electrical features, with a photo-supported report.'
  },
  'services/used-car-pdi.html': {
    title: 'Used Car PDI in Delhi NCR | 300+ Checks',
    description: 'Book a used car PDI in Delhi NCR before handover. Get 300+ checks, paint thickness readings, selected OBD scanning and a photo-supported report.'
  }
};

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function setMeta(html, attr, name, value) {
  const re = new RegExp('(<meta\\s+' + attr + '="' + name + '"[^>]*?content=")[^"]*("[^>]*>)', 'i');
  return re.test(html) ? html.replace(re, '$1' + escapeAttr(value) + '$2') : html;
}

let changed = 0;
for (const [file, o] of Object.entries(OVERRIDES)) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) { console.warn('SEO meta override skipped, file not found: ' + file); continue; }
  const original = fs.readFileSync(full, 'utf8');
  if (/http-equiv=["']refresh/i.test(original)) continue;
  if (/name=["']robots["']\s+content=["'][^"']*noindex/i.test(original)) continue;
  let html = original;
  html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, '<title>' + escapeAttr(o.title) + '</title>');
  html = setMeta(html, 'name', 'description', o.description);
  html = setMeta(html, 'property', 'og:title', o.title);
  html = setMeta(html, 'property', 'og:description', o.description);
  html = setMeta(html, 'name', 'twitter:title', o.title);
  html = setMeta(html, 'name', 'twitter:description', o.description);
  if (html !== original) { fs.writeFileSync(full, html, 'utf8'); changed++; }
}
console.log('SEO title/description overrides applied to ' + changed + ' page(s).');
