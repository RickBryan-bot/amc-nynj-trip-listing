// AMC Activities Directory fetcher — pure HTTP, no browser needed.
//
// Replays the exact Aura call the directory page makes in the browser
// (captured from DevTools, Nov 15 2026):
//   POST https://activities.outdoors.org/s/sfsites/aura
//   Apex: OC_ActivitySearchController.searchForActivitiesApplyFilters
// Guest access: aura.token is null, no login or secret required.
// The fwuid/app token below come from the page bootstrap; if Salesforce
// ever rotates them, re-capture them from the page shell (see README).
//
// Filters applied (Nov 16 2026, per Richard):
//   - chapter NY-North Jersey; programTypes '--all--' (verified: returns
//     every Program_Type__c the chapter has — Volunteer Led + AMC 150.
//     Staff Activities and Naturalist Program are real types elsewhere
//     but have zero NY-NoJ activities)
//   - PLUS chapter-independent program types, fetched with separate
//     chapterless calls and merged in (deduped by Id). The 500-mile
//     filter applies to their in-person trips; online events from all
//     calls are included (see the online rule below):
//       "Professional Guides" — 19 records; all within 500 miles
//         (NOLS WFA courses across New England, the farthest in
//         Maine at ~304 mi). (The directory label "AMC Professional
//         Guides" matches nothing; the value is "Professional Guides".)
//       "Naturalist Program" — 42 records, all at the White Mountain
//         lodges (Carroll / Gorham, NH), 272+ mi away: all within
//         500 miles as of Nov 16, 2026.
//       "Staff Activities" — 10 records: 4 online, the rest in
//         Philadelphia, Amherst / Boston MA, Jackson NH and
//         Greenville ME: all within 500 miles as of Nov 16, 2026.
//     At 500 miles these calls add a large number of trips — the page
//     is effectively the whole upcoming directory with coordinates.
//     Their online events ARE included (see the online rule below).
//   - online events are included, from every call (chapter and
//     chapterless program types alike). They carry online:true,
//     location '' and distanceMi null. (Nov 16 2026: the online
//     filter was first added, then reversed the same day per Richard,
//     and then widened to all online events, also per Richard — the
//     AMC-wide virtual events he first had left out are in too.)
//   - 500-mile radius around 5 W 63rd St, New York, NY
//     (site-geocoded 40.770936, -73.980547). Uses the trip's own
//     Start_Latitude__c/Start_Longitude__c with a haversine
//     calculation; the result is still stored as distanceMi on each
//     trip, but the embeds no longer display it (removed Nov 16
//     evening per Richard — the mileage confused participants).
//     Widened Nov 16 evening from 100 to 500 miles per Richard;
//     500 mi is the directory page's own maximum radius, so the
//     page now shows effectively every upcoming activity with
//     coordinates. (At 60 mi this reproduced the directory's Where
//     filter exactly, verified Nov 16.) In-person trips with no
//     coordinates are dropped, as the site does.
// Usage: node fetch-trips-aura.mjs [chapterId]
//   Default chapter: NY-North Jersey (0015000001Sg064AAB)
// Output: trips.json — { fetchedAt, chapter, source, count, trips[] }
//   trip: { title, date, time, dateText, dateISO, activityType, subType,
//           status, leaders[], location, url, image, openForRegistration }
import fs from 'fs';

const CHAPTER = process.argv[2] || '0015000001Sg064AAB';
const FWUID = 'NjZ1S2dpaDFCTURrSEliQmh0ZXRhZ2tVMjdnTGFERUU2S3FfSVdrcU92bkExNS4zLjE2MDEw';
const APP_TOKEN = '1913_ebdeTt9njw4JArw_mL8PvA';
const DEFAULT_IMAGE = 'https://activities.outdoors.org/resource/1745325135000/OC_DefaultActivityImage';

const filtersJsonSpecs = (additionalFilters) => JSON.stringify({ additionalFilters });

const auraContext = JSON.stringify({ mode: 'PROD', fwuid: FWUID,
  app: 'siteforce:communityApp',
  loaded: { 'APPLICATION@markup://siteforce:communityApp': APP_TOKEN },
  dn: [], globals: {}, uad: true });

async function fetchRecords(additionalFilters, pageURI) {
  const message = JSON.stringify({ actions: [{ id: '202;a',
    descriptor: 'aura://ApexActionController/ACTION$execute',
    callingDescriptor: 'UNKNOWN',
    params: { namespace: '', classname: 'OC_ActivitySearchController',
      method: 'searchForActivitiesApplyFilters',
      params: { filtersJsonSpecs: filtersJsonSpecs(additionalFilters) },
      cacheable: false, isContinuation: false } }] });
  const res = await fetch('https://activities.outdoors.org/s/sfsites/aura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams({
      message,
      'aura.context': auraContext,
      'aura.pageURI': pageURI,
      'aura.token': 'null',
    }),
  });
  if (!res.ok) { console.error('HTTP', res.status); process.exit(1); }
  const data = await res.json();
  const action = data.actions && data.actions[0];
  if (!action || action.state !== 'SUCCESS') {
    console.error('Aura call failed:', JSON.stringify(data).slice(0, 500));
    process.exit(1);
  }
  return action.returnValue.returnValue || [];
}

// Call 1: the chapter's own activities (all program types).
const chapterRecords = await fetchRecords({
  audiences: '--all--',
  programTypes: '--all--',
  openForRegistration: false,
  noCostTrips: false,
  chapters: CHAPTER,
}, `/s/activity-directory?chapters=${CHAPTER}`);

// Calls 2+: chapter-independent program types — fetched chapterless
// and merged in (deduped by Id below).
const EXTRA_PROGRAM_TYPES = ['Professional Guides', 'Naturalist Program', 'Staff Activities'];
const extraRecords = [];
for (const programType of EXTRA_PROGRAM_TYPES) {
  const recs = await fetchRecords({
    audiences: '--all--',
    programTypes: programType,
    openForRegistration: false,
    noCostTrips: false,
  }, '/s/activity-directory');
  console.log(`  ${programType}: ${recs.length} records`);
  extraRecords.push(...recs);
}

const seen = new Set();
const records = [...chapterRecords, ...extraRecords].filter(a => {
  if (seen.has(a.Id)) return false;
  seen.add(a.Id);
  return true;
});

function imageUrl(a) {
  try {
    const img = JSON.parse(a.Image_File_ID__c || 'null');
    if (img && img.cvId) {
      return `${img.orgDomain}/sfc/dist/version/renditionDownload` +
        `?rendition=THUMB720BY480&versionId=${img.cvId}` +
        `&d=${encodeURIComponent(img.publicLinkIdentifier)}&oid=${img.orgId}`;
    }
  } catch { /* fall through to default */ }
  return DEFAULT_IMAGE;
}

function toISO(dateStr, timeStr) {
  // Times are chapter-local (Time_Zone__c is e.g. "US EST"); emit ISO with -05:00.
  const m = (timeStr || '').match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!m) return `${dateStr}T00:00:00-05:00`;
  let h = parseInt(m[1], 10);
  if (/pm/i.test(m[3]) && h !== 12) h += 12;
  if (/am/i.test(m[3]) && h === 12) h = 0;
  return `${dateStr}T${String(h).padStart(2, '0')}:${m[2]}:00-05:00`;
}

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

const HOME_LAT = 40.770936, HOME_LNG = -73.980547; // 5 W 63rd St, NY, NY (site geocode)
const RADIUS_MI = 500;

function distanceMi(lat, lng) {
  const R = 3958.8, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat - HOME_LAT), dLon = toRad(lng - HOME_LNG);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(HOME_LAT)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const trips = records
  .filter(a => a.Start_Date__c && a.Start_Date__c >= today)
  .filter(a => { // online: included from every call; in-person: 500-mile radius
    if (a.Online_Event__c) return true;
    const lat = a.Start_Latitude__c, lng = a.Start_Longitude__c;
    return lat && lng && distanceMi(lat, lng) <= RADIUS_MI;
  })
  .map(a => ({
    title: a.Activity_Name__c,
    date: a.Start_Date__c,
    time: a.Start_Time__c || '',
    dateText: a.Start_Concatenation_Formula_Unconverted__c || '',
    dateISO: toISO(a.Start_Date__c, a.Start_Time__c),
    activityType: a.Main_Activity_Type__c || '',
    subType: a.Main_Activity_Sub_Type__c || '',
    programType: a.Program_Type__c || '',
    status: a.Status__c || '',
    leaders: (a.OC_Trip_Leaders__r || []).map(l => l.Contact__r && l.Contact__r.Name).filter(Boolean),
    location: a.Start_Location__c
      ? [a.Start_Location__c.city, a.Start_Location__c.state].filter(Boolean).join(', ') : '',
    online: !!a.Online_Event__c,
    distanceMi: a.Online_Event__c ? null
      : Math.round(distanceMi(a.Start_Latitude__c, a.Start_Longitude__c) * 10) / 10,
    url: `https://activities.outdoors.org/s/oc-activity/${a.Id}`,
    image: imageUrl(a),
    openForRegistration: !!a.Open_for_registration__c,
  }))
  .sort((x, y) => x.dateISO.localeCompare(y.dateISO));

fs.writeFileSync('trips.json', JSON.stringify({
  fetchedAt: new Date().toISOString(),
  chapter: CHAPTER,
  source: `https://activities.outdoors.org/s/activity-directory?chapters=${CHAPTER}`,
  count: trips.length,
  trips,
}, null, 2));
console.log(`Fetched ${chapterRecords.length} chapter + ${extraRecords.length} extra-program records (${records.length} unique), ${trips.length} upcoming. Wrote trips.json`);
trips.slice(0, 8).forEach(t => console.log(' -', t.dateText, '|', t.title, '|', t.activityType));
