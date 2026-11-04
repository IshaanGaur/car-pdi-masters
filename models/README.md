# Car model & variant content

This folder is the editable source area for model-specific PDI research and content, parallel to the existing `locations/` structure.

## Folder convention

```text
models/
  README.md
  catalog.json
  <brand-slug>/
    <model-slug>/
      model.json
      variants.json
      content.md
```

- `model.json`: verified model identity, generation/facelift and source notes.
- `variants.json`: variant names/specifications with source and verification date.
- `content.md`: model-specific inspection guidance, only after research is complete.
- Do not create an indexable HTML page merely because a folder exists.

## SEO publishing gate

A model page may be published only when it has at least one defensible reason to exist:
1. Search Console shows meaningful model/query impressions or model + location demand; or
2. The model has genuinely distinct inspection concerns that can be explained accurately with evidence.

Avoid mass-produced brand/model/variant pages that repeat the generic PDI checklist. Keep pages out of the sitemap until content is researched, reviewed and intentionally published.

## Content accuracy rules

- Use manufacturer/official documentation for variant names and feature availability wherever possible.
- Record source URLs and the date checked in the relevant JSON.
- Never imply a feature (for example ADAS, panoramic sunroof, 360 camera, TPMS or a particular engine/transmission) is present on every variant.
- Do not invent model-specific defects or failure patterns.
- Distinguish visual/functional inspection from mechanical testing or dismantling.
- Describe OBD scanning as package-dependent; it is not included in every package.
- Keep existing service and locality URLs unchanged unless a separate, evidence-led migration plan is approved.

## Current status

The first model folder is a research scaffold only. No model page is currently being added to the sitemap or made indexable.
