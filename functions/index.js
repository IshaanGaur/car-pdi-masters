const crypto = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

initializeApp();
const db = getFirestore();

const testKeyId = defineSecret('RAZORPAY_TEST_KEY_ID');
const testKeySecret = defineSecret('test7717');
const liveKeyId = defineSecret('RAZORPAY_LIVE_KEY_ID');
const liveKeySecret = defineSecret('LiveSecret');
const testWebhookSecret = defineSecret('RAZORPAY_TEST_WEBHOOK_SECRET');
const liveWebhookSecret = defineSecret('LiveWebhookSecret');
const orderSecrets = [testKeyId, testKeySecret, liveKeyId, liveKeySecret];
const verifySecrets = [testKeyId, testKeySecret, liveKeyId, liveKeySecret];
const webhookSecrets = [testWebhookSecret, liveWebhookSecret];
const REGION = 'asia-south1';

function credentials(mode) {
  if (mode === 'TEST') return { keyId: testKeyId.value(), keySecret: testKeySecret.value() };
  if (mode === 'LIVE') return { keyId: liveKeyId.value(), keySecret: liveKeySecret.value() };
  throw new HttpsError('failed-precondition', 'The Admin payment mode is not configured.');
}

function webhookSecret(mode) {
  if (mode === 'TEST') return testWebhookSecret.value();
  if (mode === 'LIVE') return liveWebhookSecret.value();
  throw new Error('Invalid payment mode for webhook.');
}

function safeEqualHex(expected, actual) {
  if (!/^[a-f0-9]{64}$/i.test(actual || '')) return false;
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(actual, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function validateBooking(booking, bookingCode, phone) {
  if (!booking || booking.bookingId !== bookingCode) {
    throw new HttpsError('not-found', 'Booking could not be verified. Reopen your booking link.');
  }
  if (!phone || normalizePhone(booking.customerPhone) !== normalizePhone(phone)) {
    throw new HttpsError('permission-denied', 'The mobile number does not match this booking.');
  }
  if (booking.bookingStatus !== 'PAYMENT_PENDING') {
    throw new HttpsError('failed-precondition', 'This booking is not awaiting its booking payment.');
  }
  if (['PAID', 'APPROVED'].includes(booking.bookingPaymentStatus)) {
    throw new HttpsError('already-exists', 'The booking payment is already recorded.');
  }
  const amount = Number(booking.bookingAmount);
  const total = Number(booking.finalAmount ?? booking.totalServicePrice);
  const balance = Number(booking.balanceAmount);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(total) || amount > total || Math.abs(total - amount - balance) > 0.01) {
    throw new HttpsError('failed-precondition', 'The saved Admin pricing for this booking is invalid.');
  }
  if (booking.currency !== 'INR' || !['TEST', 'LIVE'].includes(booking.paymentMode)) {
    throw new HttpsError('failed-precondition', 'The booking currency or Admin payment mode is not configured.');
  }
  return { amountPaise: Math.round(amount * 100), amount, mode: booking.paymentMode };
}

async function razorpayRequest(path, method, data, auth) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${auth.keyId}:${auth.keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(12000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.description || 'Razorpay could not complete the request.';
    throw new Error(message);
  }
  return payload;
}

async function getExistingOrder(orderId, bookingRef, booking) {
  if (!orderId) return null;
  const snap = await db.doc(`razorpayOrders/${orderId}`).get();
  if (!snap.exists || snap.data().bookingDocId !== bookingRef.id) return null;
  const order = snap.data();
  return {
    orderId,
    amount: order.amountPaise,
    currency: order.currency,
    keyId: credentials(order.paymentMode).keyId,
    bookingId: booking.bookingId,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    description: booking.inspectionType || 'Car inspection booking'
  };
}

exports.cpmCreateBookingRazorpayOrderV1 = onCall({ region: REGION, secrets: orderSecrets, maxInstances: 10 }, async (request) => {
  const bookingDocId = String(request.data?.bookingDocId || '');
  const bookingCode = String(request.data?.bookingId || '');
  const phone = String(request.data?.customerPhone || '');
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(bookingDocId) || bookingCode.length > 48 || phone.length > 30) {
    throw new HttpsError('invalid-argument', 'A valid booking reference and mobile number are required.');
  }

  const bookingRef = db.doc(`bookings/${bookingDocId}`);
  const lockRef = db.doc(`razorpayBookingOrders/${bookingDocId}`);
  const lockToken = crypto.randomUUID();
  const reservation = await db.runTransaction(async (tx) => {
    const [bookingSnap, lockSnap] = await Promise.all([tx.get(bookingRef), tx.get(lockRef)]);
    const booking = bookingSnap.exists ? bookingSnap.data() : null;
    const pricing = validateBooking(booking, bookingCode, phone);
    const lock = lockSnap.exists ? lockSnap.data() : null;
    if (lock?.status === 'CREATED' && lock.orderId) return { existingOrderId: lock.orderId, booking, pricing };
    if (lock?.status === 'CREATING' && Number(lock.leaseUntil || 0) > Date.now()) {
      throw new HttpsError('aborted', 'Payment setup is already in progress. Please retry shortly.');
    }
    tx.set(lockRef, {
      status: 'CREATING', bookingDocId, bookingCode, paymentMode: pricing.mode,
      amountPaise: pricing.amountPaise, lockToken, leaseUntil: Date.now() + 90000,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { booking, pricing };
  });

  if (reservation.existingOrderId) {
    const existing = await getExistingOrder(reservation.existingOrderId, bookingRef, reservation.booking);
    if (existing) return existing;
    throw new HttpsError('unavailable', 'The payment order needs support review. Please contact us before paying again.');
  }

  try {
    const auth = credentials(reservation.pricing.mode);
    const created = await razorpayRequest('/orders', 'POST', {
      amount: reservation.pricing.amountPaise,
      currency: 'INR',
      receipt: bookingCode.slice(0, 40),
      notes: { bookingId: bookingCode, bookingDocId, paymentMode: reservation.pricing.mode }
    }, auth);
    if (!created.id || Number(created.amount) !== reservation.pricing.amountPaise || created.currency !== 'INR') {
      throw new Error('Razorpay returned an order with a mismatched amount or currency.');
    }
    const orderRef = db.doc(`razorpayOrders/${created.id}`);
    await db.runTransaction(async (tx) => {
      const [lockSnap, bookingSnap] = await Promise.all([tx.get(lockRef), tx.get(bookingRef)]);
      if (!lockSnap.exists || lockSnap.data().lockToken !== lockToken) {
        throw new HttpsError('aborted', 'Payment setup changed. Please try again.');
      }
      const current = bookingSnap.data();
      validateBooking(current, bookingCode, phone);
      tx.set(orderRef, {
        bookingDocId, bookingCode, amountPaise: reservation.pricing.amountPaise,
        currency: 'INR', paymentMode: reservation.pricing.mode, status: 'CREATED',
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
      });
      tx.set(lockRef, {
        status: 'CREATED', orderId: created.id, amountPaise: reservation.pricing.amountPaise,
        paymentMode: reservation.pricing.mode, updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    });
    return {
      orderId: created.id,
      amount: created.amount,
      currency: created.currency,
      keyId: auth.keyId,
      bookingId: bookingCode,
      customerName: reservation.booking.customerName,
      customerPhone: reservation.booking.customerPhone,
      description: reservation.booking.inspectionType || 'Car inspection booking'
    };
  } catch (error) {
    await db.runTransaction(async (tx) => {
      const current = await tx.get(lockRef);
      if (current.exists && current.data().lockToken === lockToken) {
        tx.set(lockRef, { status: 'FAILED', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    }).catch(() => {});
    if (error instanceof HttpsError) throw error;
    console.error('Razorpay order creation failed:', error.message);
    throw new HttpsError('unavailable', 'Payment setup failed. No payment was taken. Please retry or contact support.');
  }
});

async function recordCapturedPayment(orderId, payment, source) {
  const orderRef = db.doc(`razorpayOrders/${orderId}`);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error('Payment order is not mapped to a booking.');
  const order = orderSnap.data();
  if (payment.order_id !== orderId || payment.currency !== 'INR' || Number(payment.amount) !== Number(order.amountPaise) || payment.status !== 'captured') {
    throw new Error('Captured payment details do not match the saved order.');
  }
  const bookingRef = db.doc(`bookings/${order.bookingDocId}`);
  const paymentRef = db.doc(`payments/razorpay_${payment.id}`);
  const lockRef = db.doc(`razorpayBookingOrders/${order.bookingDocId}`);
  await db.runTransaction(async (tx) => {
    const [bookingSnap, savedPayment] = await Promise.all([tx.get(bookingRef), tx.get(paymentRef)]);
    if (!bookingSnap.exists) throw new Error('The booking attached to this order no longer exists.');
    const booking = bookingSnap.data();
    if (booking.bookingId !== order.bookingCode || Math.round(Number(booking.bookingAmount) * 100) !== Number(payment.amount)) {
      throw new Error('Captured amount does not match the saved booking price.');
    }
    if (savedPayment.exists) return;
    const alreadyPaid = ['PAID', 'APPROVED'].includes(booking.bookingPaymentStatus);
    if (alreadyPaid && booking.razorpayPaymentId && booking.razorpayPaymentId !== payment.id) {
      throw new Error('A different booking payment is already recorded.');
    }
    tx.set(paymentRef, {
      bookingId: order.bookingDocId, bookingCode: order.bookingCode,
      customerId: booking.customerId || '', customerName: booking.customerName || '',
      paymentType: 'BOOKING', amount: Number(payment.amount) / 100, currency: 'INR',
      status: 'PAID', method: 'RAZORPAY', utr: payment.id,
      razorpayOrderId: orderId, razorpayPaymentId: payment.id,
      remarks: 'Captured and signature-verified by Razorpay',
      verifiedBy: source, paymentMode: order.paymentMode,
      verificationTimestamp: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    if (!alreadyPaid) {
      tx.update(bookingRef, {
        bookingPaymentStatus: 'PAID', bookingPaymentMethod: 'RAZORPAY',
        bookingPaymentUtr: payment.id, bookingPaymentRemarks: 'Razorpay captured payment verified',
        razorpayOrderId: orderId, razorpayPaymentId: payment.id,
        bookingFullyPaid: ['PAID', 'APPROVED'].includes(booking.balancePaymentStatus),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
    tx.set(orderRef, {
      status: 'PAID', razorpayPaymentId: payment.id,
      paymentCapturedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    tx.set(lockRef, { status: 'PAID', orderId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}

exports.cpmConfirmBookingRazorpayPaymentV1 = onCall({ region: REGION, secrets: verifySecrets, maxInstances: 10 }, async (request) => {
  const orderId = String(request.data?.razorpay_order_id || '');
  const paymentId = String(request.data?.razorpay_payment_id || '');
  const signature = String(request.data?.razorpay_signature || '');
  const bookingDocId = String(request.data?.bookingDocId || '');
  const bookingCode = String(request.data?.bookingId || '');
  const phone = String(request.data?.customerPhone || '');
  if (!/^order_[A-Za-z0-9]+$/.test(orderId) || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
    throw new HttpsError('invalid-argument', 'Razorpay did not return a valid payment reference.');
  }
  const orderSnap = await db.doc(`razorpayOrders/${orderId}`).get();
  if (!orderSnap.exists) throw new HttpsError('permission-denied', 'This payment order is not linked to a booking.');
  const order = orderSnap.data();
  if (order.bookingDocId !== bookingDocId || order.bookingCode !== bookingCode) {
    throw new HttpsError('permission-denied', 'This payment order does not match the booking.');
  }
  const bookingSnap = await db.doc(`bookings/${bookingDocId}`).get();
  const booking = bookingSnap.exists ? bookingSnap.data() : null;
  const auth = credentials(order.paymentMode);
  const expected = crypto.createHmac('sha256', auth.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  if (!safeEqualHex(expected, signature)) throw new HttpsError('permission-denied', 'Razorpay payment signature could not be verified.');
  if (booking?.bookingPaymentStatus === 'PAID' && booking.razorpayPaymentId === paymentId) {
    return { paid: true, bookingId: bookingCode };
  }
  validateBooking(booking, bookingCode, phone);
  let payment;
  try {
    payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`, 'GET', null, auth);
  } catch (error) {
    console.error('Razorpay payment lookup failed:', error.message);
    throw new HttpsError('unavailable', 'Payment verification is delayed. Your payment will be checked automatically.');
  }
  if (payment.status !== 'captured') return { paid: false, pending: true };
  try {
    await recordCapturedPayment(orderId, payment, 'RAZORPAY_CHECKOUT');
  } catch (error) {
    console.error('Captured payment could not be recorded:', error.message);
    throw new HttpsError('internal', 'Razorpay captured the payment; the booking update is being reconciled. Please contact support if it does not update.');
  }
  return { paid: true, bookingId: bookingCode };
});

exports.cpmRazorpayPaymentWebhookV1 = onRequest({ region: REGION, secrets: webhookSecrets, maxInstances: 10 }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const rawBody = req.rawBody;
  const signature = String(req.get('x-razorpay-signature') || '');
  const eventId = String(req.get('x-razorpay-event-id') || '');
  if (!Buffer.isBuffer(rawBody) || !signature) return res.status(400).send('Invalid webhook request');
  let event;
  try { event = JSON.parse(rawBody.toString('utf8')); }
  catch (_) { return res.status(400).send('Invalid JSON'); }
  if (event.event !== 'payment.captured') return res.status(200).send('Ignored');
  const payment = event.payload?.payment?.entity;
  const orderId = String(payment?.order_id || '');
  if (!payment?.id || !orderId) return res.status(400).send('Missing payment reference');
  try {
    const orderSnap = await db.doc(`razorpayOrders/${orderId}`).get();
    if (!orderSnap.exists) return res.status(404).send('Order not found');
    const order = orderSnap.data();
    const expected = crypto.createHmac('sha256', webhookSecret(order.paymentMode)).update(rawBody).digest('hex');
    if (!safeEqualHex(expected, signature)) return res.status(401).send('Invalid signature');
    const webhookKey = /^evt_[A-Za-z0-9_-]{1,100}$/.test(eventId)
      ? eventId
      : crypto.createHash('sha256').update(rawBody).digest('hex');
    const eventRef = db.doc(`razorpayWebhookEvents/${webhookKey}`);
    const prior = await eventRef.get();
    if (prior.exists) return res.status(200).send('Already processed');
    await recordCapturedPayment(orderId, payment, 'RAZORPAY_WEBHOOK');
    await eventRef.set({ event: event.event, orderId, paymentId: payment.id, processedAt: FieldValue.serverTimestamp() });
    return res.status(200).send('Processed');
  } catch (error) {
    console.error('Razorpay webhook processing failed:', error.message);
    return res.status(500).send('Retry later');
  }
});
