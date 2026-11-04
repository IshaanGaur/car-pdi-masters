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
function linkifyCarParakh(html) {
  const link = '<a href="https://carparakh.com/" target="_blank" rel="noopener">CarParakh</a>';
  return html.split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<a\b[\s\S]*?<\/a>|<[^>]+>)/gi)
    .map(part => part.startsWith('<') ? part : part.replace(/\bCarParakh\b/g, link))
    .join('');
}
function addBookingDisclosure(html) {
  if (/id=["']booking-platform-disclosure["']/.test(html)) return html;
  const note = '<p id="booking-platform-disclosure" class="booking-platform-disclosure">Car PDI Masters carries out the vehicle inspection. After availability is confirmed, booking coordination is handled through <a href="https://carparakh.com/" target="_blank" rel="noopener">CarParakh</a>.</p>';
  return html.replace(/<\/footer>/i, note + '</footer>');
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
    {q:'How do I enquire about ' + s + '?',a:'Use the callback form, WhatsApp enquiry link or call 99711 16411. Share your vehicle details and location; the team will confirm availability and explain that Car PDI Masters performs the inspection while CarParakh handles booking coordination.'},
    {q:'How much does a car PDI cost?',a:'The Standard PDI is listed at ₹1,499 and the Comprehensive 360° PDI at ₹2,499. Contact Car PDI Masters to confirm current package inclusions, availability and appointment details.'}
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
          if (q.acceptedAnswer && typeof q.acceptedAnswer.text === 'string' && /Razorpay|booking amount|balance payment|booking form/i.test(q.acceptedAnswer.text)) {
            changed = true;
            return {...q,acceptedAnswer:{'@type':'Answer',text:'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through CarParakh.'}};
          }
          if (q.name === 'How do I book and pay?') {
            changed = true;
            return {...q,acceptedAnswer:{'@type':'Answer',text:'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through CarParakh.'}};
          }
          return q;
        });
        if (ctx.kind === 'service' && node['@type'] === 'Service' && ['new-car-pdi','used-car-inspection'].includes(ctx.slug)) {
          node.offers = [
            {'@type':'Offer',name:'Standard PDI',price:'1499',priceCurrency:'INR',availability:'https://schema.org/InStock',url:SITE+'/#pricing'},
            {'@type':'Offer',name:'Comprehensive 360° PDI',price:'2499',priceCurrency:'INR',availability:'https://schema.org/InStock',url:SITE+'/#pricing'}
          ];
          changed = true;
        }
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
  // Remove stale booking-deposit amounts and old booking-first descriptions from all public pages.
  const enquiryWaUrl = 'https://wa.me/919971116411?text=Hello%20Car%20PDI%20Masters%2C%20I%20want%20to%20enquire%20about%20a%20car%20inspection.';
  html = html.replace(/Booking\s*:\s*₹299\s*\/\s*₹499/gi, 'Booking is completed through CarParakh after availability confirmation');
  html = html.replace(/Booking\s*₹299\s*online\s*now\s*·\s*Balance\s*₹1,200\s*before\s*inspection/gi, 'Enquire on WhatsApp or call · Booking through CarParakh after availability confirmation');
  html = html.replace(/Booking\s*₹499\s*online\s*now\s*·\s*Balance\s*₹2,000\s*before\s*inspection/gi, 'Enquire on WhatsApp or call · Booking through CarParakh after availability confirmation');
  html = html.replace(/Your booking is received first, reviewed by the team, assigned and then confirmed before the inspection is scheduled as final\./gi,
    'Start with a WhatsApp or phone enquiry. The team reviews your vehicle and location details, confirms availability and then shares the next steps to book through CarParakh.');
  html = html.replace(/Our website journey is built around choosing the right inspection, selecting an active service location, booking, review and assignment, completing payment and receiving inspection information\./gi,
    'Our enquiry-first journey helps you choose an inspection, share your vehicle location and preferred timing, confirm availability and complete booking through CarParakh.');
  html = html.replace(/<a\b([^>]*?)href=["']\/#booking["']([^>]*)>([\s\S]*?)<\/a>/gi, (m, before, after, label) => {
    const plain = label.replace(/<[^>]*>/g, '').trim();
    if (/^Book\b/i.test(plain)) return '<a' + before + 'href="' + enquiryWaUrl + '"' + after + '>Enquire on WhatsApp</a>';
    return m;
  });
  html = html.replace(/<h3>Pay booking amount<\/h3>/gi, '<h3>Complete booking through CarParakh</h3>');
  html = html.replace(/<h3>Provide vehicle location<\/h3>/gi, '<h3>Share vehicle location and preferred timing</h3>');
  html = html.replace(/Enter the Delhi inspection address and preferred date\/time\./gi, 'Share your vehicle location and preferred timing by WhatsApp or phone.');
  html = html.replace(/Choose the vehicle's actual inspection address during booking, subject to operational availability\./gi, 'Share the vehicle’s exact inspection address in your enquiry; appointment availability and access permission are confirmed before booking.');
  html = html.replace(/Enter the booking form[\s\S]{0,140}?preferred date\/time\./gi, 'Share your vehicle details, location and preferred timing by WhatsApp or phone.');
  // Sweep remaining customer-facing deposit labels, booking-first steps and malformed legacy FAQ copy.
  html = html.replace(/<p class=["']plan-pay["']>Booking\s*<b[^>]*>₹299<\/b>\s*online now\s*·\s*Balance\s*<b[^>]*>₹1,200<\/b>\s*before inspection<\/p>/gi,
    '<p class="plan-pay">Full inspection price: <b>₹1,499</b> · Enquire to confirm availability and booking steps</p>');
  html = html.replace(/<p class=["']plan-pay["']>Booking\s*<b[^>]*>₹499<\/b>\s*online now\s*·\s*Balance\s*<b[^>]*>₹2,000<\/b>\s*before inspection<\/p>/gi,
    '<p class="plan-pay">Full inspection price: <b>₹2,499</b> · Enquire to confirm availability and booking steps</p>');
  html = html.replace(/Booking\s*₹299\s*online now\s*·\s*Balance\s*₹1,200\s*before inspection/gi,
    'Full inspection price ₹1,499 · Enquire to confirm availability and booking steps');
  html = html.replace(/Booking\s*₹499\s*online now\s*·\s*Balance\s*₹2,000\s*before inspection/gi,
    'Full inspection price ₹2,499 · Enquire to confirm availability and booking steps');
  html = html.replace(/Fill in the booking form with the car details, inspection address, date and time, then The team confirms availability and shares the next steps for booking through CarParakh\. The remaining balance is paid before the inspection starts\./gi, 'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through CarParakh.');
  html = html.replace(/The remaining balance is paid before the inspection starts\./gi, '');
  html = html.replace(/Standard PDI:\s*₹1,499\s*[·•]\s*Comprehensive 360° PDI:\s*₹2,499\s*[·•]\s*Booking:\s*₹299\s*\/\s*₹499/gi,
    'Standard PDI: ₹1,499 · Comprehensive 360° PDI: ₹2,499 · Enquire to confirm availability and booking through CarParakh');
  html = html.replace(/Fill in the booking form[\s\S]{0,600}?The remaining balance is paid before the inspection starts\./gi,
    'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through CarParakh.');
  html = html.replace(/<h3>Pay booking amount<\/h3>/gi, '<h3>Confirm availability and booking</h3>');
  html = html.replaceAll('Pay booking amount', 'Confirm availability and booking');
  html = html.replace(/Pay the booking amount securely through Razorpay\.?/gi, 'The team confirms availability and shares the next steps for booking through CarParakh.');
  html = html.replace(/Fill in the booking form[\s\S]{0,420}?Razorpay\.[\s\S]{0,180}?inspection starts\./gi,
    'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through CarParakh.');
  html = html.replace(/Enter the Delhi inspection address and preferred date\/time\./gi, 'Share the vehicle location and preferred timing by WhatsApp or phone.');
  html = html.replace(/Your booking is received first, reviewed by the team, assigned and then confirmed before the inspection is scheduled as final\./gi,
    'Start with a WhatsApp or phone enquiry. The team reviews your vehicle and location details, confirms availability and shares the next steps to book through CarParakh.');
  html = html.replace(/Our website journey is built around choosing the right inspection, selecting an active service location, booking, review and assignment, completing payment and receiving inspection information\./gi,
    'Our enquiry-first journey helps you choose an inspection, share your vehicle location and preferred timing, confirm availability and complete booking through CarParakh.');
  // The customer journey is the original paid booking flow: choose a plan, submit vehicle/slot details, then pay the booking amount through Razorpay.
  const enquiryText = 'Choose your inspection plan, share vehicle and appointment details in the booking form, then complete the booking payment securely through Razorpay.';
  const wa = 'https://wa.me/919971116411?text=Hello%20Car%20PDI%20Masters%2C%20I%20need%20help%20with%20a%20car%20inspection%20booking.';
  // The locality price strip uses HTML entities, so normalize that whole customer-facing block.
  html = html.replace(/<div class=["']checkpoint-note["'][^>]*>[\s\S]*?<\/div>/gi, (block) => {
    if (!/Booking[\s\S]*?(?:299|499)/i.test(block)) return block;
    return '<div class="checkpoint-note"><strong>Standard PDI:</strong> ₹1,499 &nbsp; • &nbsp; <strong>Comprehensive 360° PDI:</strong> ₹2,499 &nbsp; • &nbsp; Booking is completed through CarParakh after availability confirmation &nbsp; • &nbsp; <a href="/#pricing">Compare plans →</a></div>';
  });
  // All public CTAs must start an enquiry, not scroll customers into the dormant direct-booking form.
  html = html.replace(/<a\b([^>]*?)href=["'](?:\/#booking|#booking)["']([^>]*)>([\s\S]*?)<\/a>/gi,
    (match, beforeHref, afterHref, label) => {
      // Brand cards intentionally use #booking as a make-selection link.
      // Preserve their logo/name markup; only convert actual booking CTAs.
      if (/\bclass=["'][^"']*\bbrand-card\b/i.test(beforeHref + afterHref)) return match;
      return '<a' + beforeHref + 'href="#booking"' + afterHref + '>Request a Callback</a>';
    });
  // Keep the original paid booking form visible; never hide or replace its Razorpay booking journey.
  html = html.replace(/<section class=["']section booking-section["'] id=["']booking["'][^>]*hidden[^>]*>/i,
    '<section class="section booking-section" id="booking">');
  // Final customer-facing sweep: normalize legacy payment labels, links and process copy.
  html = html.replace(/<div>\s*<span>Booking Amount<\/span>\s*<strong>[\s\S]*?<\/strong>\s*<\/div>/gi,
    '<div><span>Booking Process</span><strong>WhatsApp / Call</strong></div>');
  html = html.replace(/<div class=["']price-note["'][^>]*>[\s\S]*?<\/div>/gi,
    '<div class="price-note"><b>How to arrange an inspection:</b> Enquire by WhatsApp or call. The team confirms availability and shares the booking steps through CarParakh. <a href="#pricing">Compare plans →</a></div>');
  html = html.replace(/Pay only the booking amount online now; the balance is paid before the inspection starts\.?/gi,
    'Enquire by WhatsApp or call. After availability is confirmed, the team shares the booking steps through CarParakh.');
  html = html.replace(/Select an inspection type,[\s\S]{0,260}?Razorpay[^.]*\./gi, enquiryText);
  html = html.replace(/Select your inspection type and location,[\s\S]{0,260}?Razorpay[^.]*\./gi, enquiryText);
  html = html.replace(/Fill in the booking form[\s\S]{0,320}?Razorpay[\s\S]{0,160}?inspection starts\./gi, enquiryText);
  html = html.replace(/Pay the booking amount securely through Razorpay[^.]*\./gi,
    'The team confirms availability and shares the next steps for booking through CarParakh.');
  html = html.replace(/Pay booking amount securely through Razorpay[^.]*\./gi,
    'The team confirms availability and shares the next steps for booking through CarParakh.');
  html = html.replace(/<a\b([^>]*?)href=["']\/payment\.html["']([^>]*)>[\s\S]*?<\/a>/gi,
    '<a$1href="' + wa + '"$2>Enquire on WhatsApp</a>');
  html = html.replace(/<a\b([^>]*?)href=["']\/#booking["']([^>]*)>([\s\S]*?)<\/a>/gi, (m, before, after, label) => {
    const plain = label.replace(/<[^>]*>/g, '').replace(/[→»]/g, '').trim();
    if (/^(book(?:\s+(?:online|inspection(?:\s+in\s+[^]+)?|used\s+car\s+inspection))?|start\s+booking|continue\s+to\s+booking)$/i.test(plain)) {
      return '<a' + before + 'href="#booking"' + after + '>Request a Callback</a>';
    }
    return m;
  });
  html = html.replace(/<a\b([^>]*?)href=["']\/payment\.html["']([^>]*)>[\s\S]*?<\/a>/gi,
    '<a$1href="' + wa + '"$2>Enquire on WhatsApp</a>');
  html = html.replace(/<a\b([^>]*?)href=["']\/#booking["']([^>]*)>(?:Book Inspection|Book Inspection in [^<]+|Book Online|Start Booking)<\/a>/gi,
    '<a$1href="' + wa + '"$2>Enquire on WhatsApp</a>');
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
  html = html.replaceAll('href="/#booking">Book Online</a>', 'href="#booking">Request a Callback</a>');
  html = html.replaceAll('href="/#booking">Book Inspection</a>', 'href="#booking">Request a Callback</a>');
  html = html.replaceAll('href="/#booking">Book Inspection in Saket</a>', 'href="#booking">Request a Callback</a>');
  html = html.replaceAll('href="/#booking">Start Booking</a>', 'href="#booking">Request a Callback</a>');
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
  if (/<a\b[^>]*href=["']\/payment\.html["'][^>]*>(?:Payment|Payment Options|Payment Details|Pay[^<]*)<\/a>/i.test(html)) throw new Error(file + ' still exposes a customer-facing payment CTA');
  if (/<a\b[^>]*href=["']\/#booking["'][^>]*>(?:Book Online|Book Inspection(?: in [^<]+)?|Start Booking)<\/a>/i.test(html)) throw new Error(file + ' still exposes a retired direct-booking CTA');
  if (/Booking\s*<b[^>]*>₹(?:299|499)<\/b>\s*online now|Booking\s*₹(?:299|499)\s*online now/i.test(html)) throw new Error(file + ' still displays retired booking-deposit pricing');
  if (/<div class=["']checkpoint-note["'][^>]*>[\s\S]*?<strong>Booking:<\/strong>\s*<span[^>]*>(?:₹|&#8377;|&#x20b9;)\s*299<\/span>/i.test(html) || /<div class=["']checkpoint-note["'][^>]*>[\s\S]*?<strong>Booking:<\/strong>\s*<span[^>]*>(?:₹|&#8377;|&#x20b9;)\s*499<\/span>/i.test(html)) throw new Error(file + ' still displays a retired booking deposit in its locality pricing strip');
  if (/Your booking is received first, reviewed by the team|Pay booking amount|The remaining balance is paid before the inspection starts/i.test(html)) throw new Error(file + ' still contains booking-first or deposit copy');
  if (/Pay only the booking amount online now|continue to the ₹299 secure Razorpay payment page|Fill in the booking form[\s\S]{0,240}?Razorpay/i.test(html)) throw new Error(file + ' still contains retired customer-facing payment instructions');
  if (ctx.kind === 'home' && /What happens after I pay the booking amount|When is the balance payment made|booking form displays locations/i.test(html)) throw new Error('Homepage still contains retired booking instructions');
  if (ctx.kind === 'home' && !/<section class=["']section booking-section["'] id=["']booking["'][^>]*>[sS]*?CPM_SUBMIT_BOOKING/i.test(html)) throw new Error('Homepage paid booking form is missing');
  if (ctx.kind === 'home' && /<section class=["']section booking-section["'] id=["']booking["'][^>]*(?:hidden|aria-hidden=["']true["'])/i.test(html)) throw new Error('Homepage paid booking form is hidden');
  if (/Choose the new car PDI service and submit your booking details|Pay the booking amount and wait for review and assignment|Complete the pending balance before the inspection starts/i.test(html)) throw new Error(file + ' still contains retired direct-booking instructions');
  // Any booking CTA must lead to the paid booking form, not the retired callback form.
  html = html.replace(/(<a\\b[^>]*href=["'](?:\\/#booking|#booking)["'][^>]*>)([\\s\\S]*?)(<\\/a>)/gi, (m, open, label, close) => {
    const plain = label.replace(/<[^>]*>/g, '').trim();
    if (/^(Request a Callback|Enquire on WhatsApp|Start Booking|Book Online)$/i.test(plain)) return open + 'Book Inspection' + close;
    return m;
  });
  html = html.replace(/<section class=["']section booking-section["'] id=["']booking["'][^>]*hidden[^>]*>/i,
    '<section class="section booking-section" id="booking">');
  html = addBookingDisclosure(html);
  html = linkifyCarParakh(html);
  if (html !== original) { write(file, html); changed++; }
}
console.log('SEO/AEO/GEO build enhancement complete: ' + changed + ' HTML pages processed (' + htmlFiles.length + ' eligible pages).');
