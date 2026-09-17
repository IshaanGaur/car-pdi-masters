# Car PDI Masters pricing configuration

`pricing.json` is the single public pricing configuration consumed by the static website.

Current launch values:
- Service price: ₹2,499
- Booking amount: ₹299
- Balance: ₹2,200

## Admin Panel integration
The existing Admin Panel should become the authenticated editor for these values. The public website must only read the published values; it must never contain admin credentials.

For a true live admin-controlled price update, connect the Admin Panel and website to a shared Firebase/Firestore `settings/pricing` document (or an authenticated API) and keep `pricing.json` as a fallback. The website code is structured so the price loader can be swapped to that shared source without changing every page.
