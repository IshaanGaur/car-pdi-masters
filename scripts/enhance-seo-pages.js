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
    const city = bits[0] === 'gurugram' ? 'Gurugram' : 'Delhi';
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
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function faqFor(ctx) {
  if (ctx.kind === 'location') return [
    {q:'Can you inspect a car at my home, office or dealership in ' + ctx.place + '?',a:'An on-site inspection can be arranged at a home, office, dealership showroom or stockyard in ' + ctx.place + ', subject to access permission, a safe inspection area and appointment confirmation.'},
    {q:'What does a car inspection in ' + ctx.place + ' cover?',a:'The inspection uses a structured 300+ checkpoint framework covering observable exterior and paint condition, tyres, interior, accessible mechanical areas, electrical features and safety observations. Paint thickness readings are taken on applicable panels; OBD scanning is included only where the selected package and vehicle support it.'},
    {q:'How do I arrange a car inspection in ' + ctx.place + '?',a:'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection address and preferred timing. The team will confirm availability and share the next steps to book through CarParakh.'}
  ];
  const s = ctx.service;
  const f = [
    {q:'What information should I share before arranging ' + s + '?',a:'Share the car make, model, variant, whether it is new or used, the inspection location and your preferred date and time. The team can then confirm the appropriate inspection and appointment availability.'},
    {q:'What is included in the inspection report?',a:'The inspection follows a structured 300+ checkpoint framework where applicable and records observable findings with relevant photo evidence. Paint thickness measurements are taken on applicable panels. OBD scanning is used only where the selected package and vehicle support it.'},
    {q:'How do I enquire about ' + s + '?',a:'Use the WhatsApp enquiry link or call 99711 16411. Share your vehicle details and location; the team will confirm availability and guide you through booking via CarParakh.'}
  ];
  if (/New Car/.test(s)) f[0].a = 'Share the make, model, variant, dealership or delivery location and expected delivery date. The team will confirm availability for a pre-delivery inspection before you accept the vehicle.';
  if (/Used Car|Pre-Purchase/.test(s)) f[0].a = 'Share the make, model, variant, seller or vehicle location and preferred inspection time. The inspection is arranged before you finalise the purchase, subject to access and appointment confirmation.';
  if (/EV/.test(s)) f[1].a = 'The inspection covers observable body and paint condition, tyres, cabin, displays, controls, accessible electrical features and charging-related items that can be checked safely. It does not certify battery health unless a compatible, separately specified test is available.';
  return f;
}
function homeFaqs() {
  return [
    {q:'What is a new car PDI?',a:'A pre-delivery inspection is a structured check of a vehicle before accepting delivery, covering relevant exterior, interior, electrical, tyre and other inspection areas.'},
    {q:'What is a used car inspection?',a:'It is a structured assessment of a used vehicle’s observable condition and relevant inspection areas before purchase.'},
    {q:'How many checkpoints are covered?',a:'Car PDI Masters uses a 300+ checkpoint inspection framework across major vehicle systems and condition areas.'},
    {q:'How do I arrange an inspection?',a:'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and guide you through booking via CarParakh.'},
    {q:'Can I choose my inspection location?',a:'Share the exact vehicle location, such as a home, office, dealership showroom or stockyard. The team will confirm service coverage, access permission and appointment availability.'}
  ];
}
function addFaq(html, faqs) {
  const visible = '<section class="container seo-faq" aria-labelledby="seo-faq-title"><h2 id="seo-faq-title">Frequently Asked Questions</h2><div class="seo-faq-list">' +
    faqs.map(x => '<details><summary>' + escapeHtml(x.q) + '</summary><p>' + escapeHtml(x.a) + '</p></details>').join('') +
    '</div></section>';
  const schema = '<script type="application/ld+json">' + JSON.stringify({'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))}) + '</script>';
  html = html.replace(/<\/main>/i, visible + '</main>');
  html = html.replace(/<\/head>/i, schema + '</head>');
  return html;
}
function updateJsonLd(html, ctx) {
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (whole, raw) => {
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data];
      let changed = false;
      for (const node of nodes) {
        if (node['@type'] === 'FAQPage' && Array.isArray(node.mainEntity)) node.mainEntity = node.mainEntity.map(q => {
          if (q.name === 'How do I book and pay?') {
            changed = true;
            return {...q,acceptedAnswer:{'@type':'Answer',text:'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through CarParakh.'}};
          }
          return q;
        });
        if (ctx.kind === 'location' && node['@type'] === 'Service' && !node.areaServed) {
          node.areaServed = {'@type':'Place',name:ctx.place}; changed = true;
        }
      }
      return changed ? '<script type="application/ld+json">' + JSON.stringify(data) + '</script>' : whole;
    } catch (_) { return whole; }
  });
}
let changed = 0;
for (const file of htmlFiles) {
  const original = read(file);
  let html = original;
  if (/http-equiv=["']refresh/i.test(html) || /name=["']robots["']\s+content=["'][^"']*noindex/i.test(html)) continue;
  const ctx = contextFor(file);
  html = updateJsonLd(html, ctx);
  html = html.replace(/Choose the new car PDI service and submit your booking details\./gi, 'Send an enquiry with your vehicle details, inspection location and preferred timing using WhatsApp or call.');
  html = html.replace(/Pay the booking amount and wait for review and assignment\./gi, 'The team confirms appointment availability and shares the next steps for booking through CarParakh.');
  html = html.replace(/Our team reviews and confirms the inspection assignment\./gi, 'Complete the booking through CarParakh after the appointment details are confirmed.');
  html = html.replace(/Complete the pending balance before the inspection starts\./gi, 'Share any additional vehicle or access details requested before the appointment.');
  html = html.replace(/Fill in the booking form with the car details, inspection address, date and time, then pay the booking (?:amount|deposit) securely through Razorpay\. The remaining balance is paid before the inspection starts\./gi,
    'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through CarParakh.');
  html = html.replace(/(<a\b[^>]*href=["'][^"']*#booking["'][^>]*>)([\s\S]*?)(<\/a>)/gi, (m, open, label, close) => {
    const plain = label.replace(/<[^>]*>/g,'').trim().replace(/[→»]+/g,'').trim();
    if (/^(book(?:\s+(?:online|inspection|used car inspection))?|continue to booking)$/i.test(plain)) return open + 'Enquire on WhatsApp' + close;
    return m;
  });
  // Current customer journey is enquiry-first; keep dormant payment/booking code untouched.
  const enquiryText = 'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through CarParakh.';
  const wa = 'https://wa.me/919971116411?text=Hello%20Car%20PDI%20Masters%2C%20I%20want%20to%20enquire%20about%20a%20car%20inspection.';
  html = html.replaceAll('Choose EV Car PDI and submit the booking details.', 'Send an enquiry with your EV make, model, inspection location and preferred timing using WhatsApp or call.');
  html = html.replaceAll('Choose Luxury Car PDI and submit the booking details.', 'Send an enquiry with your vehicle details, inspection location and preferred timing using WhatsApp or call.');
  html = html.replaceAll('Choose the 360° inspection service and submit the booking details.', 'Send an enquiry with your vehicle details, inspection location and preferred timing using WhatsApp or call.');
  html = html.replaceAll('Pay the booking amount and wait for review or assignment.', 'The team confirms appointment availability and shares the next steps for booking through CarParakh.');
  html = html.replaceAll('Pay the booking amount first. Your booking is reviewed and assigned before final confirmation.', 'Enquire by WhatsApp or call. The team confirms availability and shares the booking steps through CarParakh.');
  html = html.replaceAll('Pay only the booking amount online now; the balance is paid before the inspection starts.', 'Send an enquiry by WhatsApp or call. Availability is confirmed before the booking is completed through CarParakh.');
  html = html.replaceAll('Select an inspection type, enter your Gurugram address, preferred date and time, and continue to the ₹299 secure Razorpay payment page.', enquiryText);
  html = html.replaceAll('Select your inspection type and location, submit the vehicle details, then use the ₹299 booking payment option. Payment is made securely through Razorpay (UPI, cards or netbanking).', enquiryText);
  html = html.replaceAll('Fill in the booking form with the car details, inspection address, date and time, then pay the booking amount securely through Razorpay. The remaining balance is paid before the inspection starts.', enquiryText);
  html = html.replaceAll('Pay booking amount securely through Razorpay (UPI, cards or netbanking).', 'The team confirms availability and shares the next steps for booking through CarParakh.');
  html = html.replaceAll('Pay the booking amount securely through Razorpay (UPI, cards or netbanking).', 'The team confirms availability and shares the next steps for booking through CarParakh.');
  html = html.replaceAll('href="/payment.html"', 'href="' + wa + '"');
  html = html.replaceAll('href="/#booking">Book Online</a>', 'href="' + wa + '">Enquire on WhatsApp</a>');
  html = html.replaceAll('href="/#booking">Book Inspection</a>', 'href="' + wa + '">Enquire on WhatsApp</a>');
  html = html.replaceAll('href="/#booking">Book Inspection in Saket</a>', 'href="' + wa + '">Enquire on WhatsApp</a>');
  html = html.replaceAll('href="/#booking">Start Booking</a>', 'href="' + wa + '">Enquire on WhatsApp</a>');
  html = html.replaceAll('>Payment Options</a>', '>Enquire on WhatsApp</a>');
  html = html.replaceAll('>Payment Details</a>', '>Enquire on WhatsApp</a>');
  html = html.replaceAll('>Pay ₹299 Booking</a>', '>Enquire on WhatsApp</a>');
  html = html.replaceAll('>Pay &#8377;299 Booking</a>', '>Enquire on WhatsApp</a>');
  html = html.replaceAll('Tap your car\'s brand to book its inspection.', 'Choose your car brand to send an inspection enquiry on WhatsApp.');
  html = html.replaceAll('Tap your car’s brand to book its inspection.', 'Choose your car brand to send an inspection enquiry on WhatsApp.');
  html = html.replaceAll('Booking Amount', 'Enquiry First');
  html = html.replaceAll('Simple payment flow:', 'How to arrange an inspection:');
  html = html.replaceAll('Pay the booking amount first. Your booking is reviewed and assigned before final confirmation.', 'Enquire by WhatsApp or call. The team confirms availability and shares the booking steps through CarParakh.');
  if (ctx.kind === 'home') {
    html = html.replace(/<details>\s*<summary>What happens after I pay the booking amount\?<\/summary>\s*<p>[\s\S]*?<\/p>\s*<\/details>/i,
      '<details><summary>How do I arrange an inspection?</summary><p>Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and guide you through booking via CarParakh.</p></details>');
    html = html.replace(/<details>\s*<summary>Can I choose my inspection location\?<\/summary>\s*<p>[\s\S]*?<\/p>\s*<\/details>/i,
      '<details><summary>Can I choose my inspection location?</summary><p>Share the exact vehicle location, such as a home, office, dealership showroom or stockyard. The team will confirm service coverage, access permission and appointment availability.</p></details>');
    html = html.replace('<details><summary>When is the balance payment made?</summary><p>The remaining balance is intended to be completed before the inspection starts.</p></details>', '');
    if (!/"@type"\s*:\s*"FAQPage"/.test(html)) html = html.replace(/<\/head>/i,
      '<script type="application/ld+json">' + JSON.stringify({'@context':'https://schema.org','@type':'FAQPage',mainEntity:homeFaqs().map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))}) + '</script></head>');
  } else if (!/"@type"\s*:\s*"FAQPage"/.test(html)) html = addFaq(html, faqFor(ctx));
  if (ctx.kind === 'location' && !/"@type"\s*:\s*"Service"/.test(html)) {
    const canonical = SITE + '/' + file;
    const entity = {'@context':'https://schema.org','@type':'Service',name:'Car PDI and Inspection in ' + ctx.place,serviceType:['New Car Pre-Delivery Inspection','Used Car Inspection','Pre-Purchase Car Inspection'],provider:{'@type':'Organization',name:'Car PDI Masters',url:SITE+'/'},areaServed:{'@type':'Place',name:ctx.place},url:canonical};
    html = html.replace(/<\/head>/i,'<script type="application/ld+json">' + JSON.stringify(entity) + '</script></head>');
  }
  if (ctx.kind === 'home' && /What happens after I pay the booking amount|When is the balance payment made|booking form displays locations/i.test(html)) throw new Error('Homepage still contains retired booking instructions');
  if (/Choose the new car PDI service and submit your booking details|Pay the booking amount and wait for review and assignment|Complete the pending balance before the inspection starts/i.test(html)) throw new Error(file + ' still contains retired direct-booking instructions');
  if (html !== original) { write(file, html); changed++; }
}
console.log('SEO/AEO/GEO build enhancement complete: ' + changed + ' HTML pages processed (' + htmlFiles.length + ' eligible pages).');
