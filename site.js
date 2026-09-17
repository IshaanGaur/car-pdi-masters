(function(){
  const fallback={defaultServicePrice:2499,bookingAmount:299,balanceAmount:2200,services:{},payment:{upiId:'9821097137@upi',accountHolder:'Ishaan Gaur',bankName:'Canara Bank',accountNumber:'110317414950',ifsc:'CNRB0008598',qrImage:'/assets/payment-qr.jpg'}};
  const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
  function apply(p){
    p=p||fallback;
    const price=Number(p.defaultServicePrice||2499), booking=Number(p.bookingAmount||299), balance=price-booking;
    document.querySelectorAll('[data-price]').forEach(el=>{const key=el.dataset.price; const val=key==='service'?price:key==='booking'?booking:key==='balance'?balance:price; el.textContent=money(val)});
    document.querySelectorAll('[data-service-price]').forEach(el=>{const key=el.dataset.servicePrice; const svc=p.services&&p.services[key]; el.textContent=money(svc?svc.price:price)});
    document.querySelectorAll('[data-payment]').forEach(el=>{const k=el.dataset.payment; el.textContent=(p.payment&&p.payment[k])||fallback.payment[k]||''});
    document.querySelectorAll('[data-payment-img]').forEach(el=>{el.src=(p.payment&&p.payment.qrImage)||fallback.payment.qrImage});
    const priceInput=document.getElementById('bookingPrice'); if(priceInput) priceInput.value=price;
    const bookingInput=document.getElementById('bookingAmount'); if(bookingInput) bookingInput.value=booking;
    const balanceInput=document.getElementById('balanceAmount'); if(balanceInput) balanceInput.value=balance;
    window.CPM_PRICING=p;
  }
  fetch('/config/pricing.json',{cache:'no-store'}).then(r=>r.ok?r.json():fallback).then(apply).catch(()=>apply(fallback));
  window.CPM_MONEY=money;
  window.CPM_SUBMIT_BOOKING=function(e){
    e.preventDefault();
    const f=e.target, get=id=>(document.getElementById(id)?.value||'').trim();
    const data={name:get('name'),mobile:get('mobile'),type:get('type'),car:get('car'),variant:get('variant'),dealer:get('dealer'),address:get('address'),date:get('date'),time:get('time'),notes:get('notes')};
    try{localStorage.setItem('cpm_booking',JSON.stringify(data));}catch(_){}
    const msg=document.getElementById('bookingMsg'); if(msg) msg.textContent='Booking details saved. Opening payment page…';
    const params=new URLSearchParams({type:data.type,car:data.car,name:data.name,mobile:data.mobile,date:data.date,time:data.time,address:data.address});
    setTimeout(()=>location.href='/payment.html?'+params.toString(),150);
    return false;
  };
})();
