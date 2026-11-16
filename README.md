# AMC Trip Fetcher — NY-North Jersey prototype

Fetches upcoming trips for the AMC New York–North Jersey chapter from the
AMC Activities Directory (activities.outdoors.org, a Salesforce Lightning
site) and writes them to `trips.json`.

## The fetcher: `fetch-trips-aura.mjs` (use this one)

Pure HTTP, no browser, no login. It replays the exact Aura call the
directory page makes in the browser (captured from DevTools, Nov 15 2026):

- `POST https://activities.outdoors.org/s/sfsites/aura`
- Apex: `OC_ActivitySearchController.searchForActivitiesApplyFilters`,
  with `filtersJsonSpecs` naming the chapter (`0015000001Sg064AAB`).
- Guest access: `aura.token` is `null`; nothing secret is needed.

```sh
node fetch-trips-aura.mjs            # NY-North Jersey (default)
node fetch-trips-aura.mjs 0015000001Sg061AAB   # another chapter, e.g. Boston
```

Output: `trips.json` — `{ fetchedAt, chapter, source, count, trips[] }`,
each trip `{ title, date, time, dateText, dateISO, activityType, subType,
status, leaders[], location, url, image, openForRegistration }`. The
activity URL is the short form (`/s/oc-activity/<Id>`), which Salesforce
redirects to the full `/actNNNNN` URL. Photos use the trip's Salesforce
rendition URL, falling back to the default AMC image when a trip has none.
Verified Nov 15, 2026: 34 records returned, 32 upcoming, all with leader
names, 24 with photos.

If the call ever starts failing, the `fwuid` / app token in the script
come from the page bootstrap and may have rotated — re-capture them from
the directory page's shell HTML (`fwuid`) and its `aura?message=...`
request (`aura.context`).

RESOLVED (Nov 15, 2026, ~21:42 EST): a fresh browser read of the live
directory page listed all 34 activities and matched this script's output
exactly — same titles, same dates (including Biking Nov 16 10:30 AM and
Harriman: Orak & Reservoirs). The fetcher output IS verified page data;
the earlier first-pass browser extraction (Ramapo-heavy, Nov 15–Dec 12)
was the stale one. The captured `aura?message=...` payload was confirmed
identical to the live r=11 Apex call, so the replay is the live call.

## Fallback: `fetch-trips.js` (headless browser)

Playwright + headless Chromium: opens the directory URL, waits ~15 s for
the trip cards to render, and scrapes them from the page. Run with
`npm install && npx playwright install chromium`, then `node fetch-trips.js`.
Only needed if the Aura call above ever breaks.

## Deploying it for amc-ny.org (browser-side version, built Nov 15 2026)

WP Engine cannot run scheduled scripts, so the fetcher runs on GitHub and
the WordPress page reads the result in the visitor's browser:

1. Create a public GitHub repo (e.g. `amc-nynj-trip-listing`) containing:
   `fetch-trips-aura.mjs`, `.github/workflows/fetch-trips.yml`, and the
   current `trips.json`.
2. GitHub Pages: Settings -> Pages -> Deploy from a branch -> `main`,
   `/ (root)`. After a minute, `trips.json` is live at
   `https://<user>.github.io/amc-nynj-trip-listing/trips.json`.
3. Actions tab -> run the workflow once manually to confirm it commits a
   fresh `trips.json`. It then runs daily at 07:00 UTC.
4. On amc-ny.org, create the page and add an Enfold **Code Block** element
   (not a Text Block). Paste the block between the COPY markers in
   `amc-trip-listing-embed.html`, replacing `YOUR-GITHUB-USERNAME` and the
   repo name in `TRIPS_URL` with the real Pages address. Publish.

The snippet fetches `trips.json`, renders the eight sections with photos,
leaders, locations and Full/Waitlist badges, and includes a name/place
filter. If the fetch ever fails, it falls back to the snapshot embedded
in the snippet (Nov 15, 2026: 32 trips) instead of showing a blank page.
GitHub Pages sends `Access-Control-Allow-Origin: *`, so the cross-site
fetch from amc-ny.org is allowed.

Regenerating the embed after a data refresh:
`embed-template.html` holds the snippet with a `__TRIPS_JSON__`
placeholder; rebuild with
`python3 -c "import json; t=open('embed-template.html').read(); d=json.load(open('trips.json')); open('amc-trip-listing-embed.html','w').write(t.replace('__TRIPS_JSON__', json.dumps(d, separators=(',',':'))))"`.

The server-side alternative (a WordPress plugin/shortcode rendering the
grid in PHP) is not built; the browser-side snippet above is the chosen
route.

## Known limitation (this VM only)

This script **cannot run inside the Muse VM**: the VM routes egress
through a proxy that stock Chromium cannot tunnel through
(`ERR_TUNNEL_CONNECTION_FAILED`, verified even for example.com), and the
VM's managed Chromium refuses to launch outside the runtime. On any
machine with direct internet access (GitHub Actions, a Pi, a laptop) the
same script runs as-is.
