# Project Parts Cost Tracker

A small static web app for tracking the parts and cost of your projects.

## Features

- Create/edit/delete **projects**.
- Inside a project, add **parts** with:
  - Name* and description
  - Purchase URL* and an optional alternative URL
  - Full price (cheapest)* — the price for buying the item as normally sold
  - Needed quantity price (cheapest) — optional; use this when you can get
    just the quantity you actually need cheaper elsewhere (e.g. a 10-pack of
    cable costs $12, but you only need 1 and found one sold individually for
    $2 — enter $2 here)
  - Quantity — how many of this part you need
- Each part's **total** uses the needed quantity price when set, otherwise it
  falls back to the full price.
- The project view shows global **Total Price** (sum of full prices) and
  **Needed Price** (sum of resolved totals, preferring the cheaper needed
  price), plus the savings between them.

\* required field

## Running it

No build step or backend required — it's plain HTML/CSS/JS and stores data
in the browser's `localStorage`. Just open `index.html` in a browser, or
serve the folder statically, e.g.:

```sh
python3 -m http.server 8080
# then visit http://localhost:8080
```

It can also be deployed as-is to any static host (GitHub Pages, Vercel,
Netlify, etc.) by pointing it at this folder.

## Notes

- Data is stored per-browser in `localStorage` — it won't sync across
  devices or browsers.
