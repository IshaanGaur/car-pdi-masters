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
if (/SCAN &(amp;)?amp; PAY|SCAN & PAY/.test(read('payment.html'))) problems.push('payment.html: has the old QR-only "SCAN & PAY" page');

if (problems.length) {
  console.error('\nWEBSITE DEPLOY STOPPED - this folder has an old or incomplete website:\n  - ' + problems.join('\n  - '));
  console.error('\nRun `git pull` to get the latest version from GitHub, then deploy again. See DEPLOY-WEBSITE.md.\n');
  process.exit(1);
}
console.log('Website check passed: Razorpay payment page and CMS fix are present.');
