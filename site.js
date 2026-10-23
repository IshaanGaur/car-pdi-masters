(function(){
  /* Legacy navigation compatibility
   * Older location pages may still point to previous homepage anchors.
   * Current homepage anchors are #process and #faq.
   */
  const LEGACY_HASHES={
    '/#how-it-works':'/#process',
    '/#faqs':'/#faq'
  };

  function setupLegacyNavigation(){

    document.addEventListener('click',event=>{

      const link=event.target.closest?.('a[href]');

      if(!link) return;

      const target=link.getAttribute('href');

      const replacement=
        LEGACY_HASHES[target];

      if(!replacement) return;

      event.preventDefault();

      window.location.href=replacement;
    });

    const current=
      window.location.pathname+
      window.location.hash;

    const replacement=
      LEGACY_HASHES[current];

    if(replacement){
      window.history.replaceState(
        null,
        '',
        replacement
      );
    }
  }

  setupLegacyNavigation();
  const firebaseConfig={apiKey:'AIzaSyD60AqqE6Hs6GlEORAkCa-UydrEtTg1P5w',authDomain:'car-pdi-masters.firebaseapp.com',projectId:'car-pdi-masters',storageBucket:'car-pdi-masters.firebasestorage.app',messagingSenderId:'540105751171',appId:'1:540105751171:web:5edba36edd0effcccb79b6',measurementId:'G-BGWPW2HG1J'};
  const fallback={paymentMode:'LIVE',serviceActive:true};
  const money=n=>'\u20B9'+Number(n||0).toLocaleString('en-IN');
  let dbPromise;
  async function db(){
    if(!dbPromise) dbPromise=Promise.all([
      import('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js')
    ]).then(([appMod,fs,functions])=>{const app=appMod.getApps()[0]||appMod.initializeApp(firebaseConfig);return{app,db:fs.getFirestore(app),fs,functions}});
    return dbPromise;
  }
  window.CPM_FIREBASE_READY=db;
  function apply(p){
    p=p||fallback;
    const configuredTotal=p.finalAmount??p.totalServicePrice??p.servicePrice;
    const pricingReady=configuredTotal!=null && Number.isFinite(Number(configuredTotal));
    const basePrice=pricingReady?Number(p.servicePrice??p.totalServicePrice??configuredTotal):NaN;
    const charges=pricingReady?Number(p.serviceCharges||0):0;
    const taxApplicable=String(p.taxApplicable||'NO').toUpperCase()==='YES';
    const taxAmount=taxApplicable?Number(p.taxAmount||0):0;
    const finalAmount=pricingReady?Number(p.finalAmount??(basePrice+charges+taxAmount)):NaN;
    const price=finalAmount;
    const booking=pricingReady?Number(p.bookingAmount??0):NaN;
    const balance=pricingReady?finalAmount-booking:NaN;
    document.querySelectorAll('[data-price]').forEach(el=>{const key=el.dataset.price; const val=key==='service'?price:key==='booking'?booking:key==='balance'?balance:price; el.textContent=pricingReady?money(val):'₹—'});
    document.querySelectorAll('[data-service-price]').forEach(el=>{const key=el.dataset.servicePrice; const svc=p.services&&p.services[key]; el.textContent=pricingReady?money(svc&&svc.price!=null?svc.price:price):'₹—'});
    const priceInput=document.getElementById('bookingPrice'); if(priceInput) priceInput.value=pricingReady?price:'';
    const bookingInput=document.getElementById('bookingAmount'); if(bookingInput) bookingInput.value=pricingReady?booking:'';
    const balanceInput=document.getElementById('balanceAmount'); if(balanceInput) balanceInput.value=pricingReady?balance:'';
    window.CPM_PRICING={...p,defaultServicePrice:price,bookingAmount:booking,balanceAmount:balance};
    return window.CPM_PRICING;
  }

  const CPM_MODELS={
    'Maruti Suzuki':['Alto K10','S-Presso','Celerio','Wagon R','Swift','Baleno','Dzire','Fronx','Brezza','Grand Vitara','Victoris','Ertiga','XL6','Invicto','e Vitara','Other'],
    'Hyundai':['Grand i10 Nios','i20','Aura','Exter','Venue','Creta','Verna','Alcazar','Tucson','Other'],
    'Tata':['Tiago','Tigor','Altroz','Punch','Nexon','Curvv','Harrier','Safari','Sierra','Tiago EV','Tigor EV','Punch EV','Nexon EV','Curvv EV','Other'],
    'Mahindra':['Bolero','Bolero Neo','Thar','Thar Roxx','Scorpio','Scorpio-N','XUV 3XO','XUV 7XO','XUV700','Marazzo','BE 6','XEV 9e','XEV 9S','Other'],
    'Toyota':['Glanza','Rumion','Urban Cruiser Taisor','Urban Cruiser Hyryder','Innova Crysta','Innova Hycross','Fortuner','Hilux','Camry','Other'],
    'Kia':['Sonet','Seltos','Carens','Syros','Other'],
    'Honda':['Amaze','City','Elevate','Other'],
    'MG':['Comet EV','Astor','Windsor EV','Hector','Gloster','ZS EV','Other'],
    'Skoda':['Slavia','Kushaq','Kylaq','Kodiaq','Superb','Other'],
    'Volkswagen':['Virtus','Taigun','Tiguan','Other'],
    'Renault':['Kwid','Triber','Kiger','Other'],
    'Nissan':['Magnite','Other'],
    'Citroën':['C3','C3 Aircross','C3 Aircross X','Basalt','eC3','Other'],
    'Jeep':['Compass','Meridian','Other'],
    'Isuzu':['D-Max','MU-X','Other'],
    'BYD':['Atto 3','Seal','e6','Seal U','Other'],
    'BMW':['2 Series','3 Series','5 Series','7 Series','X1','X3','X5','X7','Other'],
    'Mercedes-Benz':['A-Class','C-Class','E-Class','S-Class','GLA','GLC','GLE','GLS','Other'],
    'Audi':['A4','A6','A8','Q3','Q5','Q7','Q8','Other'],
    'Volvo':['EX30','XC40','XC60','XC90','Other'],
    'Lexus':['ES','NX','RX','LX','LM','Other'],
    'Jaguar':['F-Pace','I-Pace','F-Type','Other'],
    'Land Rover':['Range Rover Evoque','Range Rover Velar','Range Rover Sport','Defender','Discovery','Other'],
    'Porsche':['Macan','Cayenne','911','Taycan','Other'],
    'MINI':['Cooper','Countryman','Other'],
    'Force Motors':['Gurkha','Trax Cruiser','Other']
  };
  // Preferred Date: the next 30 days, so past dates can't be chosen.
  function fillPreferredDates(){
    const select=document.getElementById('date'); if(!select) return;
    const today=new Date(); today.setHours(0,0,0,0);
    const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const day=i=>{const d=new Date(today); d.setDate(today.getDate()+i); return d};
    // CMS-published pages may use a date picker instead of the list: limit it to the same 30 days.
    if(select.tagName==='INPUT'){
      select.min=iso(day(0));select.max=iso(day(29));
      // Open the calendar when the box itself is tapped, not only the small icon.
      if(!select.dataset.pickerBound){select.dataset.pickerBound='1';select.addEventListener('click',()=>{try{select.showPicker?.()}catch(_){}})}
      return;
    }
    if(select.tagName!=='SELECT') return;
    const keep=select.value;
    select.innerHTML='<option value="">Select preferred date</option>';
    for(let i=0;i<30;i++){
      const d=day(i), o=document.createElement('option');
      o.value=iso(d);
      o.textContent=d.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'short',year:'numeric'});
      select.appendChild(o);
    }
    if(keep) select.value=keep;
  }
  // Every page gets the same mobile menu button as the homepage (most pages only have the desktop links).
  function ensureMobileMenu(){
    const links=document.querySelector('header.nav nav.links'); if(!links) return;
    if(!links.id) links.id='main-navigation';
    if(document.querySelector('.menu-toggle')) return;
    const btn=document.createElement('button');
    btn.className='menu-toggle'; btn.type='button'; btn.textContent='☰';
    btn.setAttribute('aria-label','Open navigation'); btn.setAttribute('aria-expanded','false'); btn.setAttribute('aria-controls',links.id);
    links.parentNode.insertBefore(btn,links);
  }
  function setupHomepageUI(){
    ensureMobileMenu();
    fillPreferredDates();
    const menu=document.querySelector('.menu-toggle'), nav=document.getElementById('main-navigation');
    if(menu&&nav){
      menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
      nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}));
    }
    const make=document.getElementById('carMake'), model=document.getElementById('carModel'), otherMakeWrap=document.getElementById('otherMakeWrap'), otherModelWrap=document.getElementById('otherModelWrap'), variant=document.getElementById('variant'), otherVariantWrap=document.getElementById('otherVariantWrap'), type=document.getElementById('type'), regWrap=document.getElementById('registrationWrap');
    if(make&&model){
      const fillModels=()=>{
        const rows=CPM_MODELS[make.value]||[];
        model.disabled=!make.value||make.value==='Other';
        model.innerHTML=make.value==='Other'?'<option value="">Enter model below</option>':rows.length?'<option value="">Select car model</option>':'<option value="">Select model</option>';
        rows.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;model.appendChild(o)});
        otherMakeWrap?.classList.toggle('hidden-field',make.value!=='Other');
        if(make.value==='Other') document.getElementById('otherMake')?.focus();
        otherModelWrap?.classList.toggle('hidden-field',model.value!=='Other');
        updateVariant();
      };
      const updateVariant=()=>{
        const otherModel=model.value==='Other';
        otherModelWrap?.classList.toggle('hidden-field',!otherModel);
        const modelKey=otherModel?(document.getElementById('otherModel')?.value||'Other'):model.value;
        const variants=(modelKey&&modelKey!=='Other')?['Standard','Mid','Top','Other']:['Other'];
        variant.innerHTML='<option value="">Select variant if known</option>';
        variants.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;variant.appendChild(o)});
        otherVariantWrap?.classList.toggle('hidden-field',variant.value!=='Other');
      };
      make.addEventListener('change',fillModels); model.addEventListener('change',updateVariant);
      document.getElementById('otherModel')?.addEventListener('input',updateVariant);
      variant.addEventListener('change',()=>otherVariantWrap?.classList.toggle('hidden-field',variant.value!=='Other'));
      type?.addEventListener('change',()=>{
        const needs=['Used Car PDI','Used Car Inspection','Pre-Purchase Car Inspection'].includes(type.value);
        regWrap?.classList.toggle('hidden-field',!needs);
        const reg=document.getElementById('registrationNumber'); if(reg) reg.required=false;
      });
    }
  }

  async function loadPricing(){try{const {db:firestoreDb,fs}=await db();const snap=await fs.getDoc(fs.doc(firestoreDb,'pricing','current'));return snap.exists()?apply(snap.data()):apply(fallback)}catch(e){console.warn('Live pricing unavailable; using website fallback.',e);return apply(fallback)}}
  async function loadLocations(){
    const select=document.getElementById('location'); if(!select) return;
    try{
      const {db:firestoreDb,fs}=await db();
      const snap=await fs.getDocs(fs.query(fs.collection(firestoreDb,'locations'),fs.where('status','==','ACTIVE'),fs.where('enabledForOrders','==',true)));
      const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.name).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
      select.innerHTML='<option value="">Inspection Location</option>';
      rows.forEach(x=>{const city=x.city||'Delhi';const o=document.createElement('option');o.value=city==='Delhi'?x.name:`${x.name}, ${city}`;o.dataset.slug=x.id;o.textContent=`${x.name}, ${city}`;select.appendChild(o)});
      select.disabled=rows.length===0;
      if(!rows.length) select.innerHTML='<option value="">No locations currently accepting orders</option>';
      const note=document.getElementById('locationMsg'); if(note) note.textContent=rows.length?`${rows.length} Delhi NCR locations currently accepting new bookings.`:'No location is currently accepting new bookings. Please call or WhatsApp us.';
    }catch(e){select.innerHTML='<option value="">Locations temporarily unavailable</option>';select.disabled=true;const note=document.getElementById('locationMsg');if(note)note.textContent='Please call or WhatsApp Car PDI Masters to confirm service availability.';console.warn('Live locations unavailable.',e)}
  }
  setupHomepageUI();
  loadPricing();
  loadLocations();
  window.CPM_MONEY=money;
  window.CPM_SUBMIT_BOOKING=async function(e){
    e.preventDefault();
    const f=e.target, get=id=>(document.getElementById(id)?.value||'').trim(), msg=document.getElementById('bookingMsg'), btn=f.querySelector('button[type="submit"]');
    const make=get('carMake'), model=get('carModel'), otherMake=get('otherMake'), otherModel=get('otherModel'), variantSelect=get('variant'), otherVariant=get('otherVariant');
    const data={name:get('name'),mobile:get('mobile'),type:get('type'),car:make==='Other'?(otherMake||'Other'):make+' '+model,vehicleMake:make,vehicleModel:model,otherMake,otherModel,variant:variantSelect==='Other'?(otherVariant||''):variantSelect,dealer:'',address:get('address'),location:get('location'),date:get('date'),time:get('time'),notes:get('notes'),registrationNumber:get('registrationNumber')};
    if(!data.location){if(msg)msg.textContent='Please select an active inspection location.';return false};
    if(!data.vehicleMake||data.vehicleMake==='Other'&&!data.otherMake){if(msg)msg.textContent='Please enter the car make.';return false}
    if(data.vehicleMake!=='Other'&&!data.vehicleModel){if(msg)msg.textContent='Please select the car model.';return false}
    if(['Used Car PDI','Used Car Inspection','Pre-Purchase Car Inspection'].includes(data.type)&&!data.registrationNumber){/* registration remains optional */}
    if(btn){btn.disabled=true;btn.textContent='Checking availability…'}
    try{
      const {db:firestoreDb,fs}=await db();
      const locationSlug=document.getElementById('location')?.selectedOptions?.[0]?.dataset.slug||data.location.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const locSnap=await fs.getDoc(fs.doc(firestoreDb,'locations',locationSlug));
      if(!locSnap.exists()||locSnap.data().status!=='ACTIVE'||locSnap.data().enabledForOrders!==true)throw new Error('This location is currently paused for new orders. Please choose another active Delhi location.');
      const priceSnap=await fs.getDoc(fs.doc(firestoreDb,'pricing','current'));
      const p=priceSnap.exists()?priceSnap.data():fallback;
      const configuredTotal=p.finalAmount??p.totalServicePrice??p.servicePrice;
      const pricingReady=configuredTotal!=null && Number.isFinite(Number(configuredTotal));
      if(!pricingReady) throw new Error('Pricing is not configured for new bookings. Please contact Car PDI Masters.');
      const servicePrice=Number(p.servicePrice??p.totalServicePrice??configuredTotal);
      const serviceCharges=Number(p.serviceCharges||0);
      const taxApplicable=String(p.taxApplicable||'NO').toUpperCase()==='YES';
      const taxAmount=taxApplicable?Number(p.taxAmount||0):0;
      const finalAmount=Number(p.finalAmount??(servicePrice+serviceCharges+taxAmount));
      const booking=Number(p.bookingAmount??0);
      const balance=finalAmount-booking;
      const total=finalAmount;
      const code=`CPM-${data.date.replaceAll('-','')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      const ref=await fs.addDoc(fs.collection(firestoreDb,'bookings'),{customerName:data.name,customerPhone:data.mobile,inspectionType:data.type,vehicleMakeModel:data.car,vehicleMake:data.vehicleMake,vehicleModel:data.vehicleModel,otherMake:data.otherMake,otherModel:data.otherModel,variant:data.variant,dealerSeller:data.dealer,registrationNumber:data.registrationNumber,inspectionLocation:data.location,locationSlug,inspectionDate:data.date,timeSlot:data.time,inspectionAddress:data.address,additionalInformation:data.notes||'',bookingId:code,bookingStatus:'PAYMENT_PENDING',bookingPaymentStatus:'PENDING',balancePaymentStatus:'PENDING',totalServicePrice:total,servicePrice:servicePrice,serviceCharges:serviceCharges,taxApplicable:taxApplicable,taxAmount:taxAmount,finalAmount:finalAmount,bookingAmount:booking,balanceAmount:balance,paymentMode:p.paymentMode||'LIVE',currency:'INR',source:'WEBSITE',createdAt:fs.serverTimestamp(),updatedAt:fs.serverTimestamp()});
      try{localStorage.setItem('cpm_booking',JSON.stringify({...data,bookingId:code,firestoreId:ref.id,totalServicePrice:total,servicePrice:servicePrice,serviceCharges:serviceCharges,taxApplicable:taxApplicable,taxAmount:taxAmount,finalAmount:finalAmount,bookingAmount:booking,balanceAmount:balance}))}catch(_){ }
      if(msg)msg.textContent=`Booking ${code} created. Opening payment page…`;
      // Only booking references go in the address; customer details stay in localStorage (cpm_booking).
      const params=new URLSearchParams({bookingId:code,bookingDocId:ref.id,bookingAmount:String(booking)});
      setTimeout(()=>location.href='/payment.html?'+params.toString(),250);
    }catch(err){if(msg)msg.textContent=err.message||'Booking could not be created. Please call or WhatsApp us.';if(btn){btn.disabled=false;btn.textContent=`Continue to \u20B9${Number(window.CPM_PRICING?.bookingAmount||0).toLocaleString('en-IN')} Payment`}}
    return false;
  };
  // --- CAR PDI MASTERS CMS PUBLIC READ BRIDGE (v1) ---
  // Published CMS records override the matching static page. Static HTML remains
  // the fallback when a CMS record is missing or Firestore is unavailable.
  async function loadPublicCms(){
    try{
      const {db:firestoreDb,fs}=await db();
      const path=window.location.pathname.replace(/\/+$/,'')||'/';
      const clean=v=>String(v??'').trim();
      const normalizePath=v=>{
        const s=clean(v);
        if(!s)return'';
        if(/^https?:\/\//i.test(s)){try{return new URL(s).pathname.replace(/\/+$/,'')||'/'}catch(_){return s}}
        return ('/'+s.replace(/^\/+/,'')).replace(/\/+$/,'')||'/';
      };
      const setMeta=(name,value)=>{
        if(!value)return;
        let el=document.querySelector(`meta[name="${name}"]`);
        if(!el){el=document.createElement('meta');el.setAttribute('name',name);document.head.appendChild(el)}
        el.setAttribute('content',value);
      };
      const setProperty=(property,value)=>{
        if(!value)return;
        let el=document.querySelector(`meta[property="${property}"]`);
        if(!el){el=document.createElement('meta');el.setAttribute('property',property);document.head.appendChild(el)}
        el.setAttribute('content',value);
      };
      const setCanonical=value=>{
        if(!value)return;
        let el=document.querySelector('link[rel="canonical"]');
        if(!el){el=document.createElement('link');el.setAttribute('rel','canonical');document.head.appendChild(el)}
        el.setAttribute('href',value);
      };
      const applyCommon=d=>{
        const seoTitle=clean(d.seoTitle||d.title||d.pageTitle||d.blogTitle);
        const meta=clean(d.metaDescription);
        const keywords=clean(d.keywords);
        const canonical=clean(d.canonicalUrl);
        if(seoTitle)document.title=seoTitle;
        setMeta('description',meta); setMeta('keywords',keywords); setCanonical(canonical);
        setProperty('og:title',seoTitle); setProperty('og:description',meta); setProperty('og:url',canonical);
      };

      // Website Pages: pageContent is the migrated <main> HTML. When present,
      // it replaces the current main element, while all header/footer/booking
      // infrastructure remains intact.
      // Keep the payment page code-owned: legacy CMS HTML can remove the Razorpay button and detach its handler.
      // Page content, titles and descriptions now come from the GitHub files (the master copy).
      // Old CMS copies were silently hiding newer page edits, so Website Pages / Location Content
      // no longer replace page content. Set to true only to re-enable CMS page overrides.
      const CMS_PAGE_OVERRIDES=false;
      let pageSnap={empty:true,docs:[]};
      if(CMS_PAGE_OVERRIDES && path!=="/payment.html"){
        pageSnap=await fs.getDocs(fs.query(
          fs.collection(firestoreDb,"website_pages"),
          fs.where("pagePath","==",path),
          fs.where("status","==","PUBLISHED"),
          fs.limit(1)
        ));
      }

      // Homepage fallback: CMS may store the homepage as /index.html
      if(CMS_PAGE_OVERRIDES && pageSnap.empty && path==='/'){
        pageSnap=await fs.getDocs(fs.query(
          fs.collection(firestoreDb,'website_pages'),
          fs.where('pagePath','==','/index.html'),
          fs.where('status','==','PUBLISHED'),
          fs.limit(1)
        ));
      }
      if(!pageSnap.empty){
        const d=pageSnap.docs[0].data(); applyCommon(d);
        const content=clean(d.pageContent||d.content);
        if(content && /<main[\s>]/i.test(content)){
          const parser=new DOMParser();
          const parsed=parser.parseFromString(content,'text/html');
          const nextMain=sanitizeCmsNode(parsed.querySelector('main'));
          const currentMain=document.querySelector('main');
          if(nextMain&&currentMain){currentMain.replaceWith(nextMain);setupHomepageUI();loadPricing();loadLocations()}
        }else{
          const h1=clean(d.pageTitle);
          if(h1){const el=document.querySelector('main h1');if(el)el.textContent=h1}
        }
        document.documentElement.dataset.cmsPage='published';
      }

      // Location Content: locationContent is the migrated local section HTML.
      const locSnap=!CMS_PAGE_OVERRIDES?{empty:true,docs:[]}:await fs.getDocs(fs.query(
        fs.collection(firestoreDb,'location_content'),
        fs.where('pagePath','==',path),
        fs.where('status','==','PUBLISHED'),
        fs.limit(1)
      ));
      if(!locSnap.empty){
        const d=locSnap.docs[0].data(); applyCommon(d);
        const h1=clean(d.pageHeading||d.locationName);
        if(h1){const el=document.querySelector('main h1');if(el)el.textContent=h1}
        const hero=clean(d.introduction);
        const heroEl=document.querySelector('main .hero .hero-lead');
        if(hero&&heroEl)heroEl.textContent=hero;
        const content=clean(d.locationContent);
        if(content && /<section[\s>]/i.test(content)){
          const parser=new DOMParser();
          const parsed=parser.parseFromString(content,'text/html');
          const nextSection=sanitizeCmsNode(parsed.querySelector('section'));
          const currentSections=[...document.querySelectorAll('main > section')];
          const current= currentSections.find((el,i)=>i>0 && !el.classList.contains('hero')) || currentSections[1];
          if(nextSection&&current)current.replaceWith(nextSection);
        }
        const faqHost=document.querySelector('main .faq-grid');
        if(faqHost&&d.faqs){
          let rows=null;
          try{rows=Array.isArray(d.faqs)?d.faqs:JSON.parse(d.faqs)}catch(_){rows=null}
          if(Array.isArray(rows)){
            faqHost.innerHTML=rows.map(x=>`<details><summary>${escapeHtml(x.question||'')}</summary><p>${escapeHtml(x.answer||'')}</p></details>`).join('');
          }
        }
        document.documentElement.dataset.cmsLocation='published';
      }

      // Published SEO Schema: inject matching JSON-LD from the Admin SEO Schema Manager.
      const schemaSnap=await fs.getDocs(fs.query(
        fs.collection(firestoreDb,'seo_schema'),
        fs.where('status','==','PUBLISHED'),
        fs.limit(50)
      ));
      if(!schemaSnap.empty){
        const currentPath=normalizePath(path);
        const existingSchemas=[...document.querySelectorAll('script[data-cpm-schema="published"]')];
        existingSchemas.forEach(el=>el.remove());

        for(const doc of schemaSnap.docs){
          const d=doc.data()||{};
          const target=clean(d.targetUrl);
          if(!target)continue;

          let targetPath=target;
          try{
            targetPath=new URL(target,window.location.origin).pathname;
          }catch(_){}

          if(normalizePath(targetPath)!==currentPath)continue;

          let json=d.jsonLd;
          try{
            if(typeof json==='string')json=JSON.parse(json);
          }catch(_){
            json=null;
          }

          if(!json)continue;

          const script=document.createElement('script');
          script.type='application/ld+json';
          script.setAttribute('data-cpm-schema','published');
          script.textContent=JSON.stringify(json);
          document.head.appendChild(script);
        }
      }
      // Active redirects are public-read only and never written by the website.
      if(path==='/payment.html')return;
      const redirectSnap=await fs.getDocs(fs.query(
        fs.collection(firestoreDb,'seo_redirects'),
        fs.where('fromPath','==',path),
        fs.where('status','==','ACTIVE'),
        fs.limit(1)
      ));
      if(!redirectSnap.empty){
        const to=clean(redirectSnap.docs[0].data().toPath);
        if(to&&to.startsWith('/')&&!to.startsWith('//')&&normalizePath(to)!==path){window.location.replace(to);return}
      }
    }catch(e){
      console.warn('Public CMS bridge unavailable; keeping static website content.',e);
    }
  }
  // Remove anything executable from CMS-published HTML before it is inserted.
  function sanitizeCmsNode(root){
    if(!root)return root;
    root.querySelectorAll('script,iframe,frame,object,embed,base,link,meta').forEach(el=>el.remove());
    root.querySelectorAll('*').forEach(el=>{
      [...el.attributes].forEach(a=>{
        const n=a.name.toLowerCase(), v=String(a.value||'').trim().toLowerCase();
        if(n.startsWith('on')||n==='srcdoc'||n==='formaction')el.removeAttribute(a.name);
        else if(['href','src','xlink:href','action','poster'].includes(n)&&(v.startsWith('javascript:')||v.startsWith('vbscript:')||(v.startsWith('data:')&&!v.startsWith('data:image/'))))el.removeAttribute(a.name);
      });
    });
    // The booking form's inline onsubmit is stripped above, so re-attach the real handler.
    root.querySelectorAll('form.booking-form').forEach(f=>f.addEventListener('submit',e=>window.CPM_SUBMIT_BOOKING(e)));
    return root;
  }
  function escapeHtml(v){
    return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  loadPublicCms();

})();

/* Floating WhatsApp button (bottom right) and back-to-top arrow (bottom left), added 2026-10-23 */
(function(){
  function init(){
    if(document.querySelector('.float-whatsapp')) return;
    const wa=document.createElement('a');
    wa.className='float-whatsapp';
    wa.href='https://wa.me/919971116411?text=Hello%20Car%20PDI%20Masters%2C%20I%20want%20to%20book%20a%20car%20inspection.';
    wa.target='_blank';
    wa.rel='noopener';
    wa.setAttribute('aria-label','Chat with Car PDI Masters on WhatsApp');
    wa.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.004 3.2C8.94 3.2 3.2 8.938 3.2 16c0 2.258.59 4.464 1.712 6.41L3.09 28.8l6.55-1.718A12.76 12.76 0 0 0 16.004 28.8C23.066 28.8 28.8 23.062 28.8 16S23.066 3.2 16.004 3.2zm0 23.44a10.6 10.6 0 0 1-5.404-1.478l-.388-.23-3.888 1.02 1.038-3.79-.252-.39A10.58 10.58 0 0 1 5.36 16c0-5.866 4.776-10.64 10.644-10.64 5.866 0 10.636 4.774 10.636 10.64 0 5.868-4.77 10.64-10.636 10.64zm5.836-7.966c-.32-.16-1.89-.932-2.184-1.04-.292-.106-.506-.16-.718.16-.214.32-.826 1.04-1.012 1.252-.186.214-.372.24-.692.08-.32-.16-1.35-.498-2.572-1.588-.95-.848-1.592-1.894-1.778-2.214-.186-.32-.02-.492.14-.652.144-.142.32-.372.48-.558.16-.186.212-.32.32-.532.106-.214.052-.4-.028-.56-.08-.16-.718-1.732-.984-2.372-.26-.622-.522-.538-.718-.548l-.612-.012c-.212 0-.558.08-.85.4-.292.32-1.116 1.09-1.116 2.66 0 1.568 1.142 3.084 1.302 3.298.16.212 2.248 3.432 5.446 4.812.762.33 1.356.526 1.82.672.764.244 1.46.21 2.01.128.612-.092 1.89-.774 2.156-1.52.266-.746.266-1.386.186-1.52-.078-.132-.292-.212-.612-.372z"/></svg>';
    const top=document.createElement('button');
    top.type='button';
    top.className='back-to-top';
    top.setAttribute('aria-label','Back to top');
    top.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    top.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
    document.body.appendChild(wa);
    document.body.appendChild(top);
    const toggle=()=>top.classList.toggle('show',window.scrollY>400);
    window.addEventListener('scroll',toggle,{passive:true});
    toggle();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();

/* Popular brands strip: tapping a brand picks it in the booking form, added 2026-10-23 */
(function(){
  document.addEventListener('click',event=>{
    const card=event.target.closest?.('.brand-card[data-make]');
    if(!card) return;
    const make=document.getElementById('carMake');
    const booking=document.getElementById('booking');
    if(!make||!booking) return;
    event.preventDefault();
    const wanted=card.dataset.make;
    const option=[...make.options].find(o=>(o.value||o.textContent)===wanted);
    make.value=option?(option.value||option.textContent):'Other';
    make.dispatchEvent(new Event('change',{bubbles:true}));
    booking.scrollIntoView({behavior:'smooth',block:'start'});
  });
})();
