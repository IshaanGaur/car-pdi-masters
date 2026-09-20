(function(){
  const firebaseConfig={apiKey:'AIzaSyD60AqqE6Hs6GlEORAkCa-UydrEtTg1P5w',authDomain:'car-pdi-masters.firebaseapp.com',projectId:'car-pdi-masters',storageBucket:'car-pdi-masters.firebasestorage.app',messagingSenderId:'540105751171',appId:'1:540105751171:web:5edba36edd0effcccb79b6',measurementId:'G-BGWPW2HG1J'};
  const fallback={defaultServicePrice:1999,bookingAmount:299,balanceAmount:1700,paymentMode:'LIVE',serviceActive:true,payment:{upiId:'9821097137@upi',accountHolder:'Ishaan Gaur',bankName:'Canara Bank',accountNumber:'110317414950',ifsc:'CNRB0008598',qrImage:'/assets/payment-qr.jpg'}};
  const money=n=>'\u20B9'+Number(n||0).toLocaleString('en-IN');
  let dbPromise;
  async function db(){
    if(!dbPromise) dbPromise=Promise.all([
      import('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js')
    ]).then(([appMod,fs])=>({db:fs.getFirestore(appMod.initializeApp(firebaseConfig)),fs}));
    return dbPromise;
  }
  function apply(p){
    p=p||fallback;
    const price=Number(p.defaultServicePrice??p.totalServicePrice??1999), booking=Number(p.bookingAmount??299), balance=Number(p.balanceAmount??(price-booking));
    document.querySelectorAll('[data-price]').forEach(el=>{const key=el.dataset.price; const val=key==='service'?price:key==='booking'?booking:key==='balance'?balance:price; el.textContent=money(val)});
    document.querySelectorAll('[data-service-price]').forEach(el=>{const key=el.dataset.servicePrice; const svc=p.services&&p.services[key]; el.textContent=money(svc&&svc.price!=null?svc.price:price)});
    document.querySelectorAll('[data-payment]').forEach(el=>{const k=el.dataset.payment; el.textContent=(p.payment&&p.payment[k])||fallback.payment[k]||''});
    document.querySelectorAll('[data-payment-img]').forEach(el=>{el.src=(p.payment&&p.payment.qrImage)||fallback.payment.qrImage});
    const priceInput=document.getElementById('bookingPrice'); if(priceInput) priceInput.value=price;
    const bookingInput=document.getElementById('bookingAmount'); if(bookingInput) bookingInput.value=booking;
    const balanceInput=document.getElementById('balanceAmount'); if(balanceInput) balanceInput.value=balance;
    document.querySelectorAll('[data-booking-upi]').forEach(el=>{const upi=((p.payment&&p.payment.upiId)||fallback.payment.upiId);const bookingId=new URLSearchParams(window.location.search).get('bookingId')||'';const qs=`upi://pay?pa=${encodeURIComponent(upi).replace(/%40/g,'@')}&pn=${encodeURIComponent('Car PDI Masters')}&am=${encodeURIComponent(booking)}&cu=INR${bookingId?`&tr=${encodeURIComponent(bookingId)}`:''}`;el.href=qs});
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
  function setupHomepageUI(){
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
      rows.forEach(x=>{const o=document.createElement('option');o.value=x.name;o.textContent=`${x.name}, Delhi`;select.appendChild(o)});
      select.disabled=rows.length===0;
      if(!rows.length) select.innerHTML='<option value="">No locations currently accepting orders</option>';
      const note=document.getElementById('locationMsg'); if(note) note.textContent=rows.length?`${rows.length} Delhi locations currently accepting new bookings.`:'No Delhi location is currently accepting new bookings. Please call or WhatsApp us.';
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
    if(!data.location){if(msg)msg.textContent='Please select an active Delhi inspection location.';return false};
    if(!data.vehicleMake||data.vehicleMake==='Other'&&!data.otherMake){if(msg)msg.textContent='Please enter the car make.';return false}
    if(data.vehicleMake!=='Other'&&!data.vehicleModel){if(msg)msg.textContent='Please select the car model.';return false}
    if(['Used Car PDI','Used Car Inspection','Pre-Purchase Car Inspection'].includes(data.type)&&!data.registrationNumber){/* registration remains optional */}
    if(btn){btn.disabled=true;btn.textContent='Checking availabilityâ€¦'}
    try{
      const {db:firestoreDb,fs}=await db();
      const locationSlug=data.location.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const locSnap=await fs.getDoc(fs.doc(firestoreDb,'locations',locationSlug));
      if(!locSnap.exists()||locSnap.data().status!=='ACTIVE'||locSnap.data().enabledForOrders!==true)throw new Error('This location is currently paused for new orders. Please choose another active Delhi location.');
      const priceSnap=await fs.getDoc(fs.doc(firestoreDb,'pricing','current'));
      const p=priceSnap.exists()?priceSnap.data():fallback;
      const total=Number(p.totalServicePrice??p.defaultServicePrice??1999), booking=Number(p.bookingAmount??299), balance=Number(p.balanceAmount??(total-booking));
      const code=`CPM-${data.date.replaceAll('-','')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      const ref=await fs.addDoc(fs.collection(firestoreDb,'bookings'),{customerName:data.name,customerPhone:data.mobile,inspectionType:data.type,vehicleMakeModel:data.car,vehicleMake:data.vehicleMake,vehicleModel:data.vehicleModel,otherMake:data.otherMake,otherModel:data.otherModel,variant:data.variant,dealerSeller:data.dealer,registrationNumber:data.registrationNumber,inspectionLocation:data.location,locationSlug,inspectionDate:data.date,timeSlot:data.time,inspectionAddress:data.address,additionalInformation:data.notes||'',bookingId:code,bookingStatus:'PAYMENT_PENDING',bookingPaymentStatus:'PENDING',balancePaymentStatus:'PENDING',totalServicePrice:total,bookingAmount:booking,balanceAmount:balance,paymentMode:p.paymentMode||'LIVE',currency:'INR',source:'WEBSITE',createdAt:fs.serverTimestamp(),updatedAt:fs.serverTimestamp()});
      try{localStorage.setItem('cpm_booking',JSON.stringify({...data,bookingId:code,firestoreId:ref.id,totalServicePrice:total,bookingAmount:booking,balanceAmount:balance}))}catch(_){ }
      if(msg)msg.textContent=`Booking ${code} created. Opening payment pageâ€¦`;
      const params=new URLSearchParams({bookingId:code,type:data.type,car:data.car,name:data.name,mobile:data.mobile,location:data.location,date:data.date,time:data.time,address:data.address,bookingAmount:String(booking),totalServicePrice:String(total),balanceAmount:String(balance)});
      setTimeout(()=>location.href='/payment.html?'+params.toString(),250);
    }catch(err){if(msg)msg.textContent=err.message||'Booking could not be created. Please call or WhatsApp us.';if(btn){btn.disabled=false;btn.textContent=`Continue to \u20B9${Number(window.CPM_PRICING?.bookingAmount||299).toLocaleString('en-IN')} Payment`}}
    return false;
  };
})();




