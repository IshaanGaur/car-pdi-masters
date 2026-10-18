(function () {
  const params = new URLSearchParams(window.location.search);
  const bookingDocId = params.get('bookingDocId') || '';
  const bookingId = params.get('bookingId') || '';
  const button = document.getElementById('razorpayPayButton');
  const status = document.getElementById('razorpayPaymentStatus');
  const phoneInput = document.getElementById('paymentCustomerPhone');
  const bookingIdDisplay = document.getElementById('bookingIdDisplay');
  const localBooking = (() => { try { return JSON.parse(localStorage.getItem('cpm_booking') || 'null'); } catch (_) { return null; } })();
  const matchingLocalBooking = localBooking && localBooking.bookingId === bookingId ? localBooking : null;

  if (bookingIdDisplay && bookingId) bookingIdDisplay.textContent = bookingId;
  if (phoneInput && matchingLocalBooking?.mobile) phoneInput.value = matchingLocalBooking.mobile;
  const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const bookingAmount = Number(matchingLocalBooking?.bookingAmount ?? params.get('bookingAmount'));
  const amountLabel = Number.isFinite(bookingAmount) && bookingAmount > 0 ? money(bookingAmount) : 'Verified at secure checkout';
  const amountHeading = document.getElementById('bookingAmountDisplay');
  const amountDetails = document.getElementById('bookingAmountDetails');
  if (amountHeading) amountHeading.textContent = amountLabel;
  if (amountDetails) amountDetails.textContent = amountLabel;
  if (matchingLocalBooking) {
    const fields = {
      bookingCustomer: matchingLocalBooking.name,
      bookingLocation: matchingLocalBooking.location,
      bookingDateTime: [matchingLocalBooking.date, matchingLocalBooking.time].filter(Boolean).join(' ')
    };
    Object.entries(fields).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value || '—';
    });
  }
  if (!button) return;

  const say = (message, kind) => {
    if (!status) return;
    status.textContent = message;
    status.className = `form-msg full${kind ? ` ${kind}` : ''}`;
  };

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    if (!bookingDocId || !bookingId) {
      say('Booking details are missing. Please return to the booking form or contact support.', 'error');
      return;
    }
    const customerPhone = (phoneInput?.value || matchingLocalBooking?.mobile || '').trim();
    if (!customerPhone) {
      say('Enter the mobile number used for this booking.', 'error');
      phoneInput?.focus();
      return;
    }
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      say('Secure payment is available only over HTTPS. Please reopen this page from the website.', 'error');
      return;
    }
    if (!window.Razorpay) {
      say('Secure checkout did not load. Please refresh this page or contact support.', 'error');
      return;
    }

    button.disabled = true;
    const oldLabel = button.textContent;
    button.textContent = 'Preparing secure checkout…';
    say('Checking the saved booking and Admin price…');
    try {
      if (typeof window.CPM_FIREBASE_READY !== 'function') throw new Error('Booking services are not ready. Refresh the page.');
      const { app, functions } = await window.CPM_FIREBASE_READY();
      const fnApi = functions.getFunctions(app, 'asia-south1');
      const createOrder = functions.httpsCallable(fnApi, 'cpmCreateBookingRazorpayOrderV1');
      const orderResponse = await createOrder({ bookingDocId, bookingId, customerPhone });
      const order = orderResponse.data;
      if (!order?.orderId || !order?.keyId || !Number.isInteger(Number(order.amount)) || Number(order.amount) < 100) {
        throw new Error('The payment order could not be verified. No payment was taken.');
      }
      button.textContent = `Pay ${window.CPM_MONEY ? window.CPM_MONEY(Number(order.amount) / 100) : ''} securely`;
      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Car PDI Masters',
        description: order.description || 'Car inspection booking payment',
        prefill: { name: order.customerName || '', contact: order.customerPhone || customerPhone },
        notes: { bookingId, purpose: 'Booking amount' },
        theme: { color: '#1264ff' },
        handler: async (response) => {
          button.textContent = 'Verifying payment…';
          say('Payment received by checkout. Verifying it securely with Razorpay…');
          try {
            const confirmPayment = functions.httpsCallable(fnApi, 'cpmConfirmBookingRazorpayPaymentV1');
            const confirmation = await confirmPayment({ ...response, bookingDocId, bookingId, customerPhone });
            if (confirmation.data?.paid) {
              say(`Payment verified for ${bookingId}. Your booking is now waiting for the team’s review and assignment.`, 'success');
              button.textContent = 'Booking payment verified';
              button.disabled = true;
              return;
            }
            say('Razorpay is still confirming this payment. Please do not pay again; the webhook will update your booking automatically.', 'pending');
            button.textContent = oldLabel;
            button.disabled = false;
          } catch (error) {
            say(error.message || 'Payment confirmation is delayed. Please do not pay again; contact support with your booking ID.', 'pending');
            button.textContent = oldLabel;
            button.disabled = false;
          }
        },
        modal: { ondismiss: () => { button.textContent = oldLabel; button.disabled = false; say('Checkout closed. Your booking is still waiting for payment.'); } }
      });
      checkout.on('payment.failed', (event) => {
        const reason = event?.error?.description;
        say(reason ? `Payment was not completed: ${reason}` : 'Payment was not completed. You can retry checkout.', 'error');
        button.textContent = oldLabel;
        button.disabled = false;
      });
      checkout.open();
    } catch (error) {
      say(error.message || 'Secure checkout could not be started. Please contact support.', 'error');
      button.textContent = oldLabel;
      button.disabled = false;
    }
  });
})();
