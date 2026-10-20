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
}
if (/SCAN &(amp;)?amp; PAY|SCAN & PAY/.test(read('payment.html'))) problems.push('payment.html: has the old QR-only "SCAN & PAY" page');

if (problems.length) {
  console.error('\nWEBSITE DEPLOY STOPPED - this folder has an old or incomplete website:\n  - ' + problems.join('\n  - '));
  console.error('\nRun `git pull` to get the latest version from GitHub, then deploy again. See DEPLOY-WEBSITE.md.\n');
  process.exit(1);
}
console.log('Website check passed: Razorpay payment page, booking date list and CMS fix are present.');
