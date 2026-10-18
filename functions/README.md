# Razorpay payment functions

This backend uses the price snapshot saved on each booking by the Admin-controlled Firestore pricing document. It does not contain service prices. Razorpay payment secrets are read from Firebase Secret Manager and must never be committed or pasted into chat.

## Modes

- Admin `paymentMode: TEST` uses the Razorpay test key pair and test webhook secret.
- Admin `paymentMode: LIVE` uses the live key pair and live webhook secret.
- A captured booking payment is recorded as `PAID`; the booking stays in `PAYMENT_PENDING` until the existing Admin review and assignment step is completed.
- Balance payment and inspection-start approval rules are unchanged.

## Firebase setup

The `car-pdi-masters` project must use the Blaze plan for Cloud Functions. In Firebase Secret Manager, create these six secrets using the values from the matching Razorpay mode:

| Firebase secret | Razorpay value |
| --- | --- |
| `RAZORPAY_TEST_KEY_ID` | Test API Key ID |
| `test7717` | Test API Key Secret (existing Secret Manager entry) |
| `RAZORPAY_TEST_WEBHOOK_SECRET` | Test webhook signing secret |
| `RAZORPAY_LIVE_KEY_ID` | Live API Key ID |
| `LiveSecret` | Live API Key Secret (existing Secret Manager entry) |
| `LiveWebhookSecret` | Live webhook signing secret (existing Secret Manager entry) |

Deploy the functions from the website source using `firebase.website.json` and project `car-pdi-masters`. The deploy output provides the `cpmRazorpayPaymentWebhookV1` URL. In each Razorpay mode, configure that endpoint for the `payment.captured` event with the exact matching webhook signing secret. Redeploy the functions after setting or rotating a secret.

The website and Admin hosting targets are separate. The website deployment should only include Hosting target `website`; Admin should only be deployed to target `admin` after its own build succeeds. Do not deploy Firestore or Storage rules as part of this payment rollout.

## Verification

Use Razorpay test mode and Admin payment mode `TEST` first. Verify successful capture, failed/cancelled checkout, an invalid signature, a repeated webhook, and a saved amount mismatch before switching Admin pricing to `LIVE`. The webhook is the recovery path if checkout closes before its callback completes.
