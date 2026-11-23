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
  const note = '<p id="booking-platform-disclosure" class="booking-platform-disclosure">Car PDI Masters carries out the vehicle inspection. Choose an active service location and appointment slot in the booking form, submit your vehicle details, then complete the booking payment securely through Razorpay.</p>';
  return html.replace(/<\/footer>/i, note + '</footer>');
}
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function faqFor(ctx) {
  if (ctx.kind === 'location') {
    const base = [
      {q:'Can you inspect a car at my home, office or dealership in ' + ctx.place + '?',a:'An on-site inspection can be arranged at a home, office, dealership showroom or stockyard in ' + ctx.place + ', subject to access permission, a safe inspection area and appointment confirmation.'},
      {q:'What does a car inspection in ' + ctx.place + ' cover?',a:'The inspection uses a structured 300+ checkpoint framework covering observable exterior and paint condition, tyres, interior, accessible mechanical areas, electrical features and safety observations. Paint thickness readings are taken on applicable panels; OBD scanning is included only where the selected package and vehicle support it.'},
      {q:'How do I arrange a car inspection in ' + ctx.place + '?',a:'Use the website booking form, select an active inspection location and preferred appointment slot, enter the car details and inspection address, then complete the booking payment securely through Razorpay.'}
    ];
    if (ctx.place === 'Gurugram') {
      base[0] = {q:'Can you inspect a car at a Gurugram showroom or dealer?',a:'Yes, a new-car PDI or used-car inspection can be arranged around Gurugram at a home, office, showroom or other agreed vehicle location, subject to dealer or site access permission and appointment confirmation.'};
      base[1] = {q:'Do you cover Gurugram sectors and DLF phases?',a:'Service coverage includes major Gurugram areas such as Sectors 14, 16, 28, 29 and 56, DLF Phases 1–5, Cyber City, Golf Course Road and Sohna Road. Share the exact vehicle location so availability and access can be confirmed.'};
      base[2] = {q:'What should I confirm before a Gurugram car PDI?',a:'Confirm the vehicle location, expected delivery or purchase timing, showroom or seller access, and whether the vehicle will be accessible in a safe inspection area. The team can then confirm the appointment and inspection scope.'};
    }
    return base;
  }
  const s = ctx.service;
  const f = [
    {q:'What information should I share before arranging ' + s + '?',a:'Share the car make, model, variant, whether it is new or used, the inspection location and your preferred date and time. The team can then confirm the appropriate inspection and appointment availability.'},
    {q:'What is included in the inspection report?',a:'The inspection follows a structured 300+ checkpoint framework where applicable and records observable findings with relevant photo evidence. Paint thickness measurements are taken on applicable panels. OBD scanning is used only where the selected package and vehicle support it.'},
    {q:'How do I enquire about ' + s + '?',a:'Use the website booking form, select the inspection plan and active location, enter your vehicle and appointment details, then complete the booking payment securely through Razorpay.'},
    {q:'How much does a car PDI cost?',a:'The Standard PDI is listed at ₹1,499 and the Comprehensive 360° PDI at ₹2,499. Contact Car PDI Masters to confirm current package inclusions, availability and appointment details.'}
  ];
  if (/New Car/.test(s)) f[0].a = 'Share the make, model, variant, dealership or delivery location and expected delivery date. The team will confirm availability for a pre-delivery inspection before you accept the vehicle.';
  if (/Used Car|Pre-Purchase/.test(s)) f[0].a = 'Share the make, model, variant, seller or vehicle location and preferred inspection time. The inspection is arranged before you finalise the purchase, subject to access and appointment confirmation.';
  if (/EV/.test(s)) f[1].a = 'The inspection covers observable body and paint condition, tyres, cabin, displays, controls, accessible electrical features and charging-related items that can be checked safely. It does not certify battery health unless a compatible, separately specified test is available.';
  if (/Luxury Car PDI/.test(s)) {
    f[3] = {q:'How much does a Luxury Car PDI cost?',a:'The Luxury Car PDI Advance Package is ₹4,999, with a ₹1,999 booking amount and ₹3,000 balance. Confirm current package inclusions and appointment availability before booking.'};
  }
  return f;
}
function homeFaqs() {
  return [
    {q:'What is a new car PDI?',a:'A pre-delivery inspection is a structured check of a vehicle before accepting delivery, covering relevant exterior, interior, electrical, tyre and other inspection areas.'},
    {q:'What is a used car inspection?',a:'It is a structured assessment of a used vehicle’s observable condition and relevant inspection areas before purchase.'},
    {q:'How many checkpoints are covered?',a:'Car PDI Masters uses a 300+ checkpoint inspection framework across major vehicle systems and condition areas.'},
    {q:'How do I arrange an inspection?',a:'Use the website booking form to select an inspection plan, active service location and preferred appointment slot, enter your vehicle details, then complete the booking payment securely through Razorpay.'},
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
          // Only replace the retired booking FAQ wording. Do not overwrite every
          // FAQ answer that happens to mention the current booking form.
          if (q.name === 'How do I book and pay?') {
            changed = true;
            return {...q,acceptedAnswer:{'@type':'Answer',text:'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through the website booking form.'}};
          }
          return q;
        });
        if (ctx.kind === 'service' && node['@type'] === 'Service') {
          node.offers = /Luxury Car PDI/i.test(String(node.name||ctx.service||'')) ? [
            {'@type':'Offer',name:'Luxury Car PDI — Advance Package',price:'4999',priceCurrency:'INR',availability:'https://schema.org/InStock',url:SITE+'/services/luxury-car-pdi.html'}
          ] : [
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
  // Keep the sitewide locality footer aligned with the current Delhi NCR service area.
  // This is a presentation/consistency fix only; it does not alter URLs, canonicals or booking logic.
  html = html.replace(/Serving Delhi &amp; Gurugram/gi, 'Serving Delhi NCR');
  html = html.replace(/Serving Delhi & Gurugram/gi, 'Serving Delhi NCR');
  if (ctx.kind === 'location') {
    html = html.replace(/no dealer relationship is implied/gi, 'zero dealership affiliations or commissions');
    html = html.replace(/ZERO dealer(?: or shop)? tie-ups/gi, 'zero dealership affiliations or commissions');
    html = html.replace(/OBD for all cars/gi, 'OBD scanning where the selected package and vehicle support it');
    // Keep the distinction between a visual/electrical inspection and a battery-health certification.
    html = html.replace(/Pay ₹299 booking deposit securely through Razorpay to (?:confirm|reserve) your (?:slot|inspector slot)/gi, 'Complete the booking payment securely through Razorpay through the website booking form');
    html = html.replace(/Pay ₹499 booking deposit securely through Razorpay to (?:confirm|reserve) your (?:slot|inspector slot)/gi, 'Complete the booking payment securely through Razorpay through the website booking form');
  }
  html = updateJsonLd(html, ctx);
  html = html.replace(/Choose the new car PDI service and submit your booking details\./gi, 'Use the website booking form to enter your vehicle details, inspection location and preferred appointment timing.');
  html = html.replace(/Pay the booking amount and wait for review and assignment\./gi, 'Select an active service location and preferred appointment slot in the booking form, then complete the booking payment securely through Razorpay.');
  html = html.replace(/Our team reviews and confirms the inspection assignment\./gi, 'Complete the booking payment securely through Razorpay after submitting the vehicle and appointment details.');
  html = html.replace(/Complete the pending balance before the inspection starts\./gi, 'Share any additional vehicle or access details requested before the appointment.');
  html = html.replace(/Fill in the booking form with the car details, inspection address, date and time, then pay the booking (?:amount|deposit) securely through Razorpay\. The remaining balance is paid before the inspection starts\./gi,
    'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through the website booking form.');

  // Remove stale booking-deposit amounts and old booking-first descriptions from all public pages.
  html = html.replace(/Booking\s*:\s*₹299\s*\/\s*₹499/gi, 'Booking is completed through the website booking form after availability confirmation');
  html = html.replace(/Booking\s*₹299\s*online\s*now\s*·\s*Balance\s*₹1,200\s*before\s*inspection/gi, 'Booking through the website form · Secure Razorpay payment');
  html = html.replace(/Booking\s*₹499\s*online\s*now\s*·\s*Balance\s*₹2,000\s*before\s*inspection/gi, 'Booking through the website form · Secure Razorpay payment');
  html = html.replace(/Your booking is received first, reviewed by the team, assigned and then confirmed before the inspection is scheduled as final\./gi,
    'Start with the website booking form, submit your vehicle and appointment details, then complete the booking payment securely through Razorpay.');
  html = html.replace(/Our website journey is built around choosing the right inspection, selecting an active service location, booking, review and assignment, completing payment and receiving inspection information\./gi,
    'Choose an inspection plan, enter your vehicle and appointment details, then pay the booking amount securely through Razorpay to create your booking.');

  html = html.replace(/<h3>Pay booking amount<\/h3>/gi, '<h3>Complete booking through the website booking form</h3>');
  html = html.replace(/<h3>Provide vehicle location<\/h3>/gi, '<h3>Share vehicle location and preferred timing</h3>');
  html = html.replace(/Enter the Delhi inspection address and preferred date\/time\./gi, 'Share your vehicle location and preferred timing by WhatsApp or phone.');
  html = html.replace(/Choose the vehicle's actual inspection address during booking, subject to operational availability\./gi, 'Share the vehicle’s exact inspection address in your enquiry; appointment availability and access permission are confirmed before booking.');
  html = html.replace(/Enter the booking form[\s\S]{0,140}?preferred date\/time\./gi, 'Share your vehicle details, location and preferred timing by WhatsApp or phone.');
  html = html.replace(/Select your inspection type, provide the vehicle details and enter the actual inspection location\. Then use the available ₹299 booking payment option through the website payment flow\./gi,
    'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through the website booking form.');
  html = html.replace(/For a new car PDI the inspection should happen at the dealer before you sign the delivery papers\. Enter the dealer address in the booking form\. Your home address in Adarsh Nagar is only needed if the car is already with you\./gi,
    'For a new car PDI, share the dealer or delivery address where the vehicle will be inspected. Your home address is only needed when the vehicle is already with you.');

  // Sweep remaining customer-facing deposit labels, booking-first steps and malformed legacy FAQ copy.
  html = html.replace(/<p class=["']plan-pay["']>Booking\s*<b[^>]*>₹299<\/b>\s*online now\s*·\s*Balance\s*<b[^>]*>₹1,200<\/b>\s*before inspection<\/p>/gi,
    '<p class="plan-pay">Full inspection price: <b>₹1,499</b> · Book through the website form</p>');
  html = html.replace(/<p class=["']plan-pay["']>Booking\s*<b[^>]*>₹499<\/b>\s*online now\s*·\s*Balance\s*<b[^>]*>₹2,000<\/b>\s*before inspection<\/p>/gi,
    '<p class="plan-pay">Full inspection price: <b>₹2,499</b> · Book through the website form</p>');
  html = html.replace(/Booking\s*₹299\s*online now\s*·\s*Balance\s*₹1,200\s*before inspection/gi,
    'Full inspection price ₹1,499 · Book through the website form');
  html = html.replace(/Booking\s*₹499\s*online now\s*·\s*Balance\s*₹2,000\s*before inspection/gi,
    'Full inspection price ₹2,499 · Book through the website form');
  html = html.replace(/Fill in the booking form with the car details, inspection address, date and time, then The team confirms availability and shares the next steps for booking through the website booking form\. The remaining balance is paid before the inspection starts\./gi, 'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through the website booking form.');
  html = html.replace(/The remaining balance is paid before the inspection starts\./gi, '');
  html = html.replace(/Standard PDI:\s*₹1,499\s*[·•]\s*Comprehensive 360° PDI:\s*₹2,499\s*[·•]\s*Booking:\s*₹299\s*\/\s*₹499/gi,
    'Standard PDI: ₹1,499 · Comprehensive 360° PDI: ₹2,499 · Book through the website form');
  html = html.replace(/Fill in the booking form[\s\S]{0,600}?The remaining balance is paid before the inspection starts\./gi,
    'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through the website booking form.');
  html = html.replace(/<h3>Pay booking amount<\/h3>/gi, '<h3>Confirm availability and booking</h3>');
  html = html.replaceAll('Pay booking amount', 'Confirm availability and booking');
  html = html.replace(/Pay the booking amount securely through Razorpay\.?/gi, 'Use the website booking form to submit the vehicle and appointment details, then complete the booking payment securely through Razorpay.');
  html = html.replace(/Fill in the booking form[\s\S]{0,420}?Razorpay\.[\s\S]{0,180}?inspection starts\./gi,
    'Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and share the next steps for booking through the website booking form.');
  html = html.replace(/Enter the Delhi inspection address and preferred date\/time\./gi, 'Share the vehicle location and preferred timing by WhatsApp or phone.');
  html = html.replace(/Your booking is received first, reviewed by the team, assigned and then confirmed before the inspection is scheduled as final\./gi,
    'Start with the website booking form, submit your vehicle and appointment details, then complete the booking payment securely through Razorpay.');
  html = html.replace(/Our website journey is built around choosing the right inspection, selecting an active service location, booking, review and assignment, completing payment and receiving inspection information\./gi,
    'Choose an inspection plan, enter your vehicle and appointment details, then complete the booking payment securely through Razorpay.');
  // The customer journey is the original paid booking flow: choose a plan, submit vehicle/slot details, then pay the booking amount through Razorpay.
  const enquiryText = 'Choose your inspection plan, share vehicle and appointment details in the booking form, then complete the booking payment securely through Razorpay.';
  const wa = 'https://wa.me/919971116411?text=Hello%20Car%20PDI%20Masters%2C%20I%20need%20help%20with%20a%20car%20inspection%20booking.';
  // The locality price strip uses HTML entities, so normalize that whole customer-facing block.
  html = html.replace(/<div class=["']checkpoint-note["'][^>]*>[\s\S]*?<\/div>/gi, (block) => {
    if (!/Booking[\s\S]*?(?:299|499)/i.test(block)) return block;
    return '<div class="checkpoint-note"><strong>Standard PDI:</strong> ₹1,499 &nbsp; • &nbsp; <strong>Comprehensive 360° PDI:</strong> ₹2,499 &nbsp; • &nbsp; Booking is completed through the website booking form after availability confirmation &nbsp; • &nbsp; <a href="/#pricing">Compare plans →</a></div>';
  });
  // Booking CTAs must remain attached to the live paid booking form.
  // Do not rewrite /#booking links to callback or WhatsApp: check-website.js treats
  // /#booking as the canonical customer booking destination.
  html = html.replace(/<a\b([^>]*?)href=["'](?:\/#booking|#booking)["']([^>]*)>([\s\S]*?)<\/a>/gi,
    (match, beforeHref, afterHref, label) => {
      const plain = label.replace(/<[^>]*>/g, '').replace(/[→»]+/g, '').trim();
      if (/^(request a callback|start booking|book online|book inspection|continue to booking|enquire on whatsapp)$/i.test(plain)) {
        return '<a' + beforeHref + 'href="#booking"' + afterHref + '>Book Inspection</a>';
      }
      return match;
    });
  // Keep the original paid booking form visible; never hide or replace its Razorpay booking journey.
  html = html.replace(/<section class=["']section booking-section["'] id=["']booking["'][^>]*hidden[^>]*>/i,
    '<section class="section booking-section" id="booking">');
  // Final customer-facing sweep: normalize legacy payment labels, links and process copy.
  html = html.replace(/<div>\s*<span>Booking Amount<\/span>\s*<strong>[\s\S]*?<\/strong>\s*<\/div>/gi,
    '<div><span>Booking Amount</span><strong>Secure Razorpay Payment</strong></div>');
  html = html.replace(/<div class=["']price-note["'][^>]*>[\s\S]*?<\/div>/gi,
    '<div class="price-note"><b>How to arrange an inspection:</b> Use the website booking form to select an active service location, enter your vehicle and appointment details, then complete the booking payment securely through Razorpay. <a href="#pricing">Compare plans →</a></div>');
  html = html.replace(/Pay only the booking amount online now; the balance is paid before the inspection starts\.?/gi,
    'Use the website booking form to enter your vehicle and appointment details, then complete the booking payment securely through Razorpay.');
  html = html.replace(/Select an inspection type,[\s\S]{0,260}?Razorpay[^.]*\./gi, enquiryText);
  html = html.replace(/Select your inspection type and location,[\s\S]{0,260}?Razorpay[^.]*\./gi, enquiryText);
  html = html.replace(/Fill in the booking form[\s\S]{0,320}?Razorpay[\s\S]{0,160}?inspection starts\./gi, enquiryText);
  html = html.replace(/Pay the booking amount securely through Razorpay[^.]*\./gi,
    'Use the website booking form to submit the vehicle and appointment details, then complete the booking payment securely through Razorpay.');
  html = html.replace(/Pay booking amount securely through Razorpay[^.]*\./gi,
    'Use the website booking form to submit the vehicle and appointment details, then complete the booking payment securely through Razorpay.');
  // Retired direct-payment links should not bypass the live booking form.
  // Route legacy /payment.html anchors to the booking section instead.
  html = html.replace(/<a\b([^>]*?)href=["']\/payment\.html(?:\?[^"']*)?["']([^>]*)>([\s\S]*?)<\/a>/gi,
    '<a$1href="#booking"$2>Book Inspection</a>');
  html = html.replace(/<a\b([^>]*?)href=["']\/#booking["']([^>]*)>([\s\S]*?)<\/a>/gi, (m, before, after, label) => {
    const plain = label.replace(/<[^>]*>/g, '').replace(/[→»]/g, '').trim();
    if (/^(request a callback|enquire on whatsapp|start booking|book online|book inspection|continue to booking)$/i.test(plain)) {
      return '<a' + before + 'href="#booking"' + after + '>Book Inspection</a>';
    }
    return m;
  });
  html = html.replaceAll('Choose EV Car PDI and submit the booking details.', 'Send an enquiry with your EV make, model, inspection location and preferred timing using WhatsApp or call.');
  html = html.replaceAll('Choose Luxury Car PDI and submit the booking details.', 'Use the website booking form to enter your vehicle details, inspection location and preferred appointment timing.');
  html = html.replaceAll('Choose the 360° inspection service and submit the booking details.', 'Use the website booking form to enter your vehicle details, inspection location and preferred appointment timing.');
  html = html.replaceAll('Pay the booking amount and wait for review or assignment.', 'Select an active service location and preferred appointment slot in the booking form, then complete the booking payment securely through Razorpay.');
  html = html.replaceAll('Pay the booking amount first. Your booking is reviewed and assigned before final confirmation.', 'Use the website booking form to select an active service location, enter your vehicle and appointment details, then complete the booking payment securely through Razorpay.');
  html = html.replaceAll('Pay only the booking amount online now; the balance is paid before the inspection starts.', 'Submit the vehicle and appointment details through the website booking form, then complete the booking payment securely through Razorpay.');
  html = html.replaceAll('Select an inspection type, enter your Gurugram address, preferred date and time, and continue to the ₹299 secure Razorpay payment page.', enquiryText);
  html = html.replaceAll('Select your inspection type and location, submit the vehicle details, then use the ₹299 booking payment option. Payment is made securely through Razorpay (UPI, cards or netbanking).', enquiryText);
  html = html.replaceAll('Fill in the booking form with the car details, inspection address, date and time, then pay the booking amount securely through Razorpay. The remaining balance is paid before the inspection starts.', enquiryText);
  html = html.replaceAll('Pay booking amount securely through Razorpay (UPI, cards or netbanking).', 'Use the website booking form to submit the vehicle and appointment details, then complete the booking payment securely through Razorpay.');
  html = html.replaceAll('Pay the booking amount securely through Razorpay (UPI, cards or netbanking).', 'Use the website booking form to submit the vehicle and appointment details, then complete the booking payment securely through Razorpay.');
  html = html.replaceAll('href="/payment.html"', 'href="#booking"');
  html = html.replaceAll('href="/#booking">Book Online</a>', 'href="#booking">Book Inspection</a>');
  html = html.replaceAll('href="/#booking">Book Inspection</a>', 'href="#booking">Book Inspection</a>');
  html = html.replaceAll('href="/#booking">Book Inspection in Saket</a>', 'href="#booking">Book Inspection</a>');
  html = html.replaceAll('href="/#booking">Start Booking</a>', 'href="#booking">Book Inspection</a>');
  html = html.replaceAll(' >Payment Options</a>', '>Payment Options</a>');
  html = html.replaceAll(' >Payment Details</a>', '>Payment Details</a>');
  html = html.replaceAll(' >Pay ₹299 Booking</a>', '>Pay ₹299 Booking</a>');
  html = html.replaceAll(' >Pay &#8377;299 Booking</a>', '>Pay &#8377;299 Booking</a>');
  html = html.replaceAll('Tap your car\'s brand to book its inspection.', 'Choose your car brand to send an inspection enquiry on WhatsApp.');
  html = html.replaceAll('Tap your car’s brand to book its inspection.', 'Choose your car brand to send an inspection enquiry on WhatsApp.');
  html = html.replaceAll('Booking Amount', 'Booking Amount');
  html = html.replaceAll('Simple payment flow:', 'How to arrange an inspection:');
  html = html.replaceAll('Pay the booking amount first. Your booking is reviewed and assigned before final confirmation.', 'Use the website booking form to select an active service location, enter your vehicle and appointment details, then complete the booking payment securely through Razorpay.');
  if (ctx.kind === 'home') {
    html = html.replace(/<details>\s*<summary>What happens after I pay the booking amount\?<\/summary>\s*<p>[\s\S]*?<\/p>\s*<\/details>/i,
      '<details><summary>How do I arrange an inspection?</summary><p>Send an enquiry by WhatsApp or call 99711 16411 with your car make, model, inspection location and preferred timing. The team will confirm availability and guide you through the website booking process.</p></details>');
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
  if (ctx.kind === 'home' && !/<section class=["']section booking-section["'] id=["']booking["'][^>]*>[\s\S]*?CPM_SUBMIT_BOOKING/i.test(html)) throw new Error('Homepage paid booking form is missing');
  if (ctx.kind === 'home' && /<section class=["']section booking-section["'] id=["']booking["'][^>]*(?:hidden|aria-hidden=["']true["'])/i.test(html)) throw new Error('Homepage paid booking form is hidden');
  // Final CTA guard: every explicit booking CTA must point to the live paid booking form.
  html = html.replace(/(<a\b[^>]*href=["'](?:\/#booking|#booking)["'][^>]*>)([\s\S]*?)(<\/a>)/gi, (m, open, label, close) => {
    const plain = label.replace(/<[^>]*>/g, '').trim();
    if (/^(Request a Callback|Enquire on WhatsApp|Start Booking|Book Online|Book Inspection)$/i.test(plain)) {
      return open + 'Book Inspection' + close;
    }
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
