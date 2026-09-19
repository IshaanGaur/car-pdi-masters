(function(){
  const firebaseConfig={apiKey:'AIzaSyD60AqqE6Hs6GlEORAkCa-UydrEtTg1P5w',authDomain:'car-pdi-masters.firebaseapp.com',projectId:'car-pdi-masters',storageBucket:'car-pdi-masters.firebasestorage.app',messagingSenderId:'540105751171',appId:'1:540105751171:web:5edba36edd0effcccb79b6',measurementId:'G-BGWPW2HG1J'};
  const fallback={defaultServicePrice:2499,bookingAmount:299,balanceAmount:2200,paymentMode:'LIVE',serviceActive:true,payment:{upiId:'9821097137@upi',accountHolder:'Ishaan Gaur',bankName:'Canara Bank',accountNumber:'110317414950',ifsc:'CNRB0008598',qrImage:'/assets/payment-qr.jpg'}};
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
    const price=Number(p.defaultServicePrice??p.totalServicePrice??2499), booking=Number(p.bookingAmount??299), balance=Number(p.balanceAmount??(price-booking));
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
  loadPricing();
  loadLocations();
  window.CPM_MONEY=money;
  window.CPM_SUBMIT_BOOKING=async function(e){
    e.preventDefault();
    const f=e.target, get=id=>(document.getElementById(id)?.value||'').trim(), msg=document.getElementById('bookingMsg'), btn=f.querySelector('button[type="submit"]');
    const data={name:get('name'),mobile:get('mobile'),type:get('type'),car:get('car'),variant:get('variant'),dealer:get('dealer'),address:get('address'),location:get('location'),date:get('date'),time:get('time'),notes:get('notes')};
    if(!data.location){if(msg)msg.textContent='Please select an active Delhi inspection location.';return false}
    if(btn){btn.disabled=true;btn.textContent='Checking availabilityâ€¦'}
    try{
      const {db:firestoreDb,fs}=await db();
      const locationSlug=data.location.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const locSnap=await fs.getDoc(fs.doc(firestoreDb,'locations',locationSlug));
      if(!locSnap.exists()||locSnap.data().status!=='ACTIVE'||locSnap.data().enabledForOrders!==true)throw new Error('This location is currently paused for new orders. Please choose another active Delhi location.');
      const priceSnap=await fs.getDoc(fs.doc(firestoreDb,'pricing','current'));
      const p=priceSnap.exists()?priceSnap.data():fallback;
      const total=Number(p.totalServicePrice??p.defaultServicePrice??2499), booking=Number(p.bookingAmount??299), balance=Number(p.balanceAmount??(total-booking));
      const code=`CPM-${data.date.replaceAll('-','')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      const ref=await fs.addDoc(fs.collection(firestoreDb,'bookings'),{customerName:data.name,customerPhone:data.mobile,inspectionType:data.type,vehicleMakeModel:data.car,variant:data.variant,dealerSeller:data.dealer,inspectionLocation:data.location,locationSlug,inspectionDate:data.date,timeSlot:data.time,inspectionAddress:data.address,additionalInformation:data.notes||'',bookingId:code,bookingStatus:'PAYMENT_PENDING',bookingPaymentStatus:'PENDING',balancePaymentStatus:'PENDING',totalServicePrice:total,bookingAmount:booking,balanceAmount:balance,paymentMode:p.paymentMode||'LIVE',currency:'INR',source:'WEBSITE',createdAt:fs.serverTimestamp(),updatedAt:fs.serverTimestamp()});
      try{localStorage.setItem('cpm_booking',JSON.stringify({...data,bookingId:code,firestoreId:ref.id,totalServicePrice:total,bookingAmount:booking,balanceAmount:balance}))}catch(_){ }
      if(msg)msg.textContent=`Booking ${code} created. Opening payment pageâ€¦`;
      const params=new URLSearchParams({bookingId:code,type:data.type,car:data.car,name:data.name,mobile:data.mobile,location:data.location,date:data.date,time:data.time,address:data.address,bookingAmount:String(booking),totalServicePrice:String(total),balanceAmount:String(balance)});
      setTimeout(()=>location.href='/payment.html?'+params.toString(),250);
    }catch(err){if(msg)msg.textContent=err.message||'Booking could not be created. Please call or WhatsApp us.';if(btn){btn.disabled=false;btn.textContent=`Continue to \u20B9${Number(window.CPM_PRICING?.bookingAmount||299).toLocaleString('en-IN')} Payment`}}
    return false;
  };
})();




