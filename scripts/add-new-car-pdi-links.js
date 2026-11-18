// Build-time internal linking for SEO.
// Adds a short "New car PDI" block with a keyword link to /services/new-car-pdi.html
// on every indexable location page (hubs and locality pages), so the many locality
// pages that already rank pass relevance and authority to the new-car PDI service page.
// Runs from firebase.website.json "predeploy", AFTER scripts/enhance-seo-pages.js.
// Safe to run repeatedly: a page that already has the block (id="new-car-pdi-link") is skipped.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const TARGET = '/services/new-car-pdi.html';
const files = [];
(function walk(dir) {
  for (const item of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, item.name);
    if (item.isDirectory()) walk(rel);
    else if (item.isFile() && item.name.endsWith('.html')) files.push(rel);
  }
})('locations');
function humanize(slug) {
  return slug.split('-').map(w => w.toLowerCase() === 'dlf' ? 'DLF' : w.toLowerCase() === 'ev' ? 'EV' : w.toLowerCase() === 'rk' ? 'RK' : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function placeFor(file) {
  const bits = file.replace(/^locations\//, '').replace(/\.html$/, '').split('/');
  const cityBySlug = { delhi: 'Delhi', gurugram: 'Gurugram', noida: 'Noida' };
  const city = cityBySlug[bits[0]] || humanize(bits[0]);
  return bits.length > 1 ? humanize(bits.slice(1).join('-')) + ', ' + city : city;
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
let changed = 0;
for (const file of files) {
  const full = path.join(ROOT, file);
  const original = fs.readFileSync(full, 'utf8');
  if (/http-equiv=["']refresh/i.test(original)) continue;
  if (/name=["']robots["']\s+content=["'][^"']*noindex/i.test(original)) continue;
  if (/id=["']new-car-pdi-link["']/.test(original)) continue;
  if (!/<\/main>/i.test(original)) continue;
  const place = escapeHtml(placeFor(file));
  const block = '<section class="container new-car-pdi-link" id="new-car-pdi-link">' +
    '<h2>New Car PDI in ' + place + '</h2>' +
    '<p>Taking delivery of a new car in ' + place + '? Get an independent ' +
    '<a href="' + TARGET + '">new car PDI service in ' + place + '</a> before you accept the vehicle: ' +
    'a 300+ checkpoint inspection with paint thickness readings and a photo-supported report.</p>' +
    '</section>';
  const html = original.replace(/<\/main>/i, block + '</main>');
  if (html !== original) { fs.writeFileSync(full, html, 'utf8'); changed++; }
}
console.log('New car PDI internal links added to ' + changed + ' of ' + files.length + ' location pages.');
