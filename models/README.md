# Brand & Model PDI SEO Engine

The model SEO system is data-driven: `models/catalog.json` is the source of truth and `scripts/generate-brand-model-pages.js` creates the public pages.

## Publishing gate
Only `status=approved`, `researchStatus=approved` and non-blocked records are generated. Seeded records remain research_pending.

## One authoritative URL per model
A model page can cover new PDI, used/pre-purchase inspection, powertrains, transmissions and variants. We do not create variant/powertrain URLs by default.

## Locations
Existing Delhi, Gurugram, Noida and locality pages are reused. Model × locality pages require separate evidence-led approval.

## Automatic SEO
Generated pages include title, meta description, canonical, robots, H1, breadcrumbs, WebPage/Service/FAQ structured data, internal links and crawlable brand/model hubs. Sitemap integration will be added by the same generator once models are approved.

## Accuracy
Before approval, verify current model identity, powertrains, transmissions and variants using official/current sources and record source URLs plus checked date.
