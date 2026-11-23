// Build-time SEO, AEO and local-entity enrichment for every indexable service/location page.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.carmasters.co.in';
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(ROOT, f), s, 'utf8');
const htmlFiles = [];
function walk(dir) {
  for (const item of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, item.name);
    if (item.isDirectory()) walk(rel);
    else if (item.isFile() && item.name.endsWith('.html')) htmlFiles.push(rel);
  }
}
walk('locations'); walk('services'); htmlFiles.push('index.html');
function humanize(slug) {
  return slug.split('-').map(w => w.toLowerCase() === 'dlf' ? 'DLF' : w.toLowerCase() === 'ev' ? 'EV' : w.toLowerCase() === 'rk' ? 'RK' : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function contextFor(file) {
  if (file.startsWith('locations/')) {
    const bits = file.replace(/^locations\//, '').replace(/\.html$/, '').split('/');
    const cityBySlug = { delhi: 'Delhi', gurugram: 'Gurugram', noida: 'Noida' };
    const city = cityBySlug[bits[0]] || humanize(bits[0]);
    const place = bits.length > 1 ? humanize(bits.slice(1).join('-')) + ', ' + city : city;
    return { kind: 'location', city, place, slug: bits.slice(1).join('-') };
  }
  if (file.startsWith('services/')) {
    const slug = path.basename(file, '.html');
    const labels = {'new-car-pdi':'New Car PDI','new-car-inspection':'New Car Inspection','used-car-pdi':'Used Car PDI','used-car-inspection':'Used Car Inspection','pre-purchase-car-inspection':'Pre-Purchase Car Inspection','pre-purchase-inspection':'Pre-Purchase Car Inspection','ev-car-pdi':'EV Car PDI','luxury-car-pdi':'Luxury Car PDI','360-degree-car-inspection':'360° Car Inspection','car-pdi':'Car PDI','car-inspection':'Car Inspection'};
    return { kind: 'service', service: labels[slug] || 'Car Inspection', slug };
  }
  return { kind: 'home' };
}
function removeLegacyBookingCoordinatorReferences(html) {
  // Migrate any legacy CarParakh references to the Car PDI Masters domain/brand.
  // Preserve the path when a legacy URL contains one; the booking journey is now owned by Car PDI Masters.
  html = html.replace(/https?:\/\/(?:www\.)?carparakh\.com/gi, SITE);
  html = html.replace(/\bCarParakh\b/gi, 'Car PDI Masters');
  return html;
}
function addBookingDisclosure(html) {
  if (/id=["']booking-platform-disclosure["']/.test(html)) return html;
  const note = '<p id="booking-platform-disclosure" class="booking-platform-disclosure">Car PDI Masters carries out the vehicle inspection. Choose an inspection plan, submit your vehicle and appointment details through the website booking form, pay the booking amount securely through Razorpay, and pay the remaining balance before the inspection starts.</p>';
  return html.replace(/<\/footer>/i, note + '</footer>');
}
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function faqFor(ctx) {
  if (ctx.kind === 'location') {
    html = html.replace(/no dealer relationship is implied/gi, 'zero dealership affiliations or commissions');
    html = html.replace(/ZERO dealer(?: or shop)? tie-ups/gi, 'zero dealership affiliations or commissions');
    html = html.replace(/OBD for all cars/gi, 'OBD scanning where the selected package and vehicle support it');
  }

  html = updateJsonLd(html, ctx);

  // Keep every public page aligned with the live paid booking journey.
  const bookingFlow = 'Choose an inspection plan, enter your vehicle and appointment details in the website booking form, then pay the booking amount securely through Razorpay. The remaining balance is paid before the inspection starts.';
  html = html.replace(/Choose the new car PDI service and submit your booking details\./gi, 'Choose the New Car PDI plan, enter your vehicle and appointment details in the booking form, then pay the booking amount securely through Razorpay.');
  html = html.replace(/Pay the booking amount and wait for review and assignment\./gi, 'Pay the booking amount securely through Razorpay. The remaining balance is paid before the inspection starts.');
  html = html.replace(/Our team reviews and confirms the inspection assignment\./gi, 'The booking is created after you submit the vehicle and appointment details and pay the booking amount.');
  html = html.replace(/Complete the pending balance before the inspection starts\./gi, 'Pay the remaining balance before the inspection starts.');
  html = html.replace(/Fill in the booking form with the car details, inspection address, date and time, then pay the booking (?:amount|deposit) securely through Razorpay\. The remaining balance is paid before the inspection starts\./gi, bookingFlow);

  // Remove retired enquiry/callback wording without changing URLs.
  html = html.replace(/Enquire to confirm availability and booking (?:steps|through the website booking form)/gi, 'Pay the booking amount securely through Razorpay');
  html = html.replace(/Enquire by WhatsApp or call to confirm availability and booking steps/gi, 'Pay the booking amount securely through Razorpay');
  html = html.replace(/Enquire on WhatsApp/gi, 'Book Inspection');
  html = html.replace(/Request a Callback/gi, 'Book Inspection');
  html = html.replace(/Enquiry First/gi, 'Booking Amount');
  html = html.replace(/Booking Process<\/span><strong>WhatsApp \/ Call/gi, 'Booking Amount</span><strong>Secure Razorpay Payment');
  html = html.replace(/How to arrange an inspection:<\/b> Enquire by WhatsApp or call\. The team confirms availability and shares the booking steps through the website booking form\./gi,
    'How to arrange an inspection:</b> Choose your plan, enter your vehicle and appointment details in the booking form, then pay the booking amount securely through Razorpay. The remaining balance is paid before the inspection starts.');
  html = html.replace(/Tap your car['’]s brand to send an inspection enquiry on WhatsApp\./gi, 'Tap your car\'s brand to book its inspection.');
  html = html.replace(/Send an enquiry with your (?:EV make, model|vehicle details), inspection location and preferred timing using WhatsApp or call\./gi,
    'Enter your vehicle details, inspection location and preferred appointment timing in the website booking form.');
  html = html.replace(/The team confirms availability and shares the next steps for booking through the website booking form\./gi,
    'Complete the booking payment securely through Razorpay in the website booking form.');
  html = html.replace(/The team confirms appointment availability and shares the next steps for booking through the website booking form\./gi,
    'Complete the booking payment securely through Razorpay in the website booking form.');
  html = html.replace(/After availability is confirmed, complete the booking and payment through the website booking form\./gi,
    'Pay the booking amount securely through Razorpay after submitting the vehicle and appointment details.');
  html = html.replace(/Booking is completed through the website booking form after availability confirmation/gi,
    'Booking through the website form with secure Razorpay payment');
  html = html.replace(/Booking through the website booking form after availability confirmation/gi,
    'Booking through the website form with secure Razorpay payment');

  // Payment links remain payment links; booking CTAs remain on the paid booking form.
  html = html.replace(/<a\b([^>]*?)href=["']\/payment\.html["']([^>]*)>([\s\S]*?)<\/a>/gi,
    '<a$1href="/payment.html"$2>Payment Options</a>');
  html = html.replace(/<a\b([^>]*?)href=["'](?:\/#booking|#booking)["']([^>]*)>([\s\S]*?)<\/a>/gi,
    (m,before,after,label) => /^(?:Enquire on WhatsApp|Request a Callback|Start Booking|Book Online)$/i.test(label.replace(/<[^>]*>/g,'').trim())
      ? '<a'+before+'href="#booking"'+after+'>Book Inspection</a>' : m);

  if (ctx.kind === 'home') {
    html = html.replace(/<details>\s*<summary>What happens after I pay the booking amount\?<\/summary>\s*<p>[\s\S]*?<\/p>\s*<\/details>/i,
      '<details><summary>How do I arrange an inspection?</summary><p>Use the website booking form to select your inspection plan and active location, enter your vehicle and appointment details, then pay the booking amount securely through Razorpay. The remaining balance is paid before the inspection starts.</p></details>');
    html = html.replace(/<details>\s*<summary>Can I choose my inspection location\?<\/summary>\s*<p>[\s\S]*?<\/p>\s*<\/details>/i,
      '<details><summary>Can I choose my inspection location?</summary><p>Select an active inspection location in the booking form and enter the exact vehicle address, subject to service coverage and access permission.</p></details>');
    html = html.replace('<details><summary>When is the balance payment made?</summary><p>The remaining balance is intended to be completed before the inspection starts.</p></details>', '');
    if (!/"@type"\s*:\s*"FAQPage"/.test(html)) html = html.replace(/<\/head>/i,
      '<script type="application/ld+json">' + JSON.stringify({'@context':'https://schema.org','@type':'FAQPage',mainEntity:homeFaqs().map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))}) + '</script></head>');
  } else if (!/"@type"\s*:\s*"FAQPage"/.test(html)) html = addFaq(html, faqFor(ctx));
  if (ctx.kind === 'location' && !/"@type"\s*:\s*"Service"/.test(html)) {
    const canonical = SITE + '/' + file;
    const entity = {'@context':'https://schema.org','@type':'Service',name:'Car PDI and Inspection in ' + ctx.place,serviceType:['New Car Pre-Delivery Inspection','Used Car Inspection','Pre-Purchase Car Inspection'],provider:{'@type':'Organization',name:'Car PDI Masters',url:SITE+'/'},areaServed:{'@type':'Place',name:ctx.place},url:canonical};
    html = html.replace(/<\/head>/i,'<script type="application/ld+json">' + JSON.stringify(entity) + '</script></head>');
  }
  if (ctx.kind === 'home' && !/<section class=["']section booking-section["'] id=["']booking["'][^>]*>[\s\S]*?CPM_SUBMIT_BOOKING/i.test(html)) throw new Error('Homepage paid booking form is missing');
  if (ctx.kind === 'home' && /<section class=["']section booking-section["'] id=["']booking["'][^>]*(?:hidden|aria-hidden=["']true["'])/i.test(html)) throw new Error('Homepage paid booking form is hidden');
  // Any booking CTA must lead to the paid booking form, not the retired callback form.
  html = html.replace(/(<a\b[^>]*href=["'](?:\/#booking|#booking)["'][^>]*>)([\s\S]*?)(<\/a>)/gi, (m, open, label, close) => {
    const plain = label.replace(/<[^>]*>/g, '').trim();
    if (/^(Request a Callback|Enquire on WhatsApp|Start Booking|Book Online)$/i.test(plain)) return open + 'Book Inspection' + close;
    return m;
  });
  html = html.replace(/<section class=["']section booking-section["'] id=["']booking["'][^>]*hidden[^>]*>/i,
    '<section class="section booking-section" id="booking">');
  html = addBookingDisclosure(html);
  html = removeLegacyBookingCoordinatorReferences(html);
  // Final public-HTML sweep: no legacy CarParakh brand or domain may remain.
  if (html !== original) { write(file, html); changed++; }
}
console.log('SEO/AEO/GEO build enhancement complete: ' + changed + ' HTML pages processed (' + htmlFiles.length + ' eligible pages).');
