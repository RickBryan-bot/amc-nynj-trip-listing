// AMC Activities Directory fetcher — multi-chapter version (v2).
//
// Replaces fetch-trips-aura.mjs in the rickbryan-bot/amc-nynj-trip-listing
// repo. Run by the GitHub Action with no arguments (see
// .github/workflows/fetch-trips.yml — no workflow change needed).
//
// WHAT CHANGED vs v1 (Nov 27, 2026, per Richard):
//   - Fetches FIVE chapters, not just NY-North Jersey, and tags every trip
//     with its chapter: `chapter` (Salesforce record Id) and `chapterName`.
//     Chapterless program-type trips (Professional Guides, Naturalist
//     Program, Staff Activities) get chapter: null / chapterName 'AMC-wide'
//     and are shown for every chapter selection on the homepage.
//   - Distance origin moved to 5 Central Park West, New York, NY
//     (geocoded 40.76882, -73.98155). RADIUS_MI stays 500 (the feed maximum);
//     the homepage's 60/100/250/500-mile buttons filter client-side.
//   - NH exclusion, online-events-included, and no-coordinates-dropped
//     rules are unchanged from v1.
//   - Output keeps `chapter` (primary chapter, NYNJ) for backward
//     compatibility and adds `chapters` (all chapter Ids fetched).
//   - Output trip shape adds `chapter`, `chapterName`, `distanceMi`
//     (miles from 5 Central Park West; null for online events).
//
// !!! APP_TOKEN: copy the `const APP_TOKEN = ...` line VERBATIM from the
// current fetch-trips-aura.mjs in the repo into this file before committing.
// It is intentionally left as a placeholder below. Everything else in this
// file is complete. The FWUID below is copied from the current file; if the
// Action ever starts failing, re-capture both from the directory page shell
// (see README).

// Filters applied:
//   - chapters: NY-North Jersey, Delaware Valley, Connecticut, Western
//     Massachusetts, Southeastern Massachusetts; programTypes '--all--'
//   - PLUS chapter-independent program types, fetched with separate
//     chapterless calls and merged in (deduped by Id):
//       "Professional Guides", "Naturalist Program", "Staff Activities"
//   - online events are included, from every call. They carry online:true,
//     location '' and distanceMi null.
//   - New Hampshire is excluded: in-person trips whose Start_Location__c
//     state is NH are dropped, from every call. Online events unaffected.
//   - 500-mile radius around 5 Central Park West, New York, NY
//     (geocoded 40.76882, -73.98155). Uses the trip's own
//     Start_Latitude__c/Start_Longitude__c with a haversine calculation;
//     the result is stored as distanceMi on each trip. In-person trips
//     with no coordinates are dropped, as the site does.
//
// Usage: node fetch-trips-aura.mjs            # all five chapters (default)
//        node fetch-trips-aura.mjs <chapterId> # one chapter, as before
//
// Output: trips.json — { fetchedAt, chapter, chapters, source, count, trips[] }
//
//   trip: { title, date, time, dateText, dateISO, activityType, subType,
//           programType, status, leaders[], location, online, distanceMi,
//           chapter, chapterName, url, image, openForRegistration }

import fs from 'fs';

const CHAPTERS = [
  { id: '0015000001Sg064AAB', name: 'New York\u2013North Jersey' },
  { id: '0015000001Sg06BAAR', name: 'Delaware Valley' },
  { id: '0015000001Sg05zAAB', name: 'Connecticut' },
  { id: '0015000001Sg05xAAB', name: 'Western Massachusetts' },
  { id: '0015000001Sg06DAAR', name: 'Southeastern Massachusetts' },
];

// Single-chapter override, as in v1: node fetch-trips-aura.mjs <chapterId>.
const CHAPTERS_TO_FETCH = process.argv[2]
  ? [{ id: process.argv[2], name: process.argv[2] }]
  : CHAPTERS;

const CHAPTER = CHAPTERS_TO_FETCH[0].id;

const FWUID = 'NjZ1S2dpaDFCTURrSEliQmh0ZXRhZ2tVMjdnTGFERUU2S3FfSVdrcU92bkExNS4zLjE2MDEw';

// >>> COPY THIS LINE VERBATIM FROM THE CURRENT fetch-trips-aura.mjs IN THE REPO <<<
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

// Call 1 (per chapter): that chapter's own activities (all program types).
// Records are tagged with their chapter so the homepage can filter by it.
// Chapter order is NYNJ first: if an activity is listed under two chapters,
// the first chapter's tag wins in the dedupe below.
const chapterRecords = [];
for (const ch of CHAPTERS_TO_FETCH) {
  const recs = await fetchRecords({
    audiences: '--all--',
    programTypes: '--all--',
    openForRegistration: false,
    noCostTrips: false,
    chapters: ch.id,
  }, `/s/activity-directory?chapters=${ch.id}`);
  console.log(`  ${ch.name} (${ch.id}): ${recs.length} records`);
  chapterRecords.push(...recs.map(r => ({ ...r, _chapterId: ch.id, _chapterName: ch.name })));
}

// Calls 2+: chapter-independent program types — fetched chapterless and
// merged in (deduped by Id below). Tagged chapter: null so the homepage
// shows them for every chapter selection.
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
  extraRecords.push(...recs.map(r => ({ ...r, _chapterId: null, _chapterName: 'AMC-wide' })));
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

const HOME_LAT = 40.76882, HOME_LNG = -73.98155; // 5 Central Park West, New York, NY (geocoded)

const RADIUS_MI = 500;

const EXCLUDED_STATES = ['NH']; // state codes to drop, from every call (online events have no location)

function distanceMi(lat, lng) {
  const R = 3958.8, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat - HOME_LAT), dLon = toRad(lng - HOME_LNG);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(HOME_LAT)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const trips = records
  .filter(a => a.Start_Date__c && a.Start_Date__c >= today)
  .filter(a => { // online: included from every call; in-person: 500-mile radius, NH excluded
    const loc = a.Start_Location__c || {};
    if (EXCLUDED_STATES.includes(loc.stateCode) || EXCLUDED_STATES.includes(loc.state) || loc.state === 'New Hampshire') return false;
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
    chapter: (a._chapterId === undefined ? null : a._chapterId),
    chapterName: a._chapterName || '',
    url: `https://activities.outdoors.org/s/oc-activity/${a.Id}`,
    image: imageUrl(a),
    openForRegistration: !!a.Open_for_registration__c,
  }))
  .sort((x, y) => x.dateISO.localeCompare(y.dateISO));

fs.writeFileSync('trips.json', JSON.stringify({
  fetchedAt: new Date().toISOString(),
  chapter: CHAPTER,
  chapters: CHAPTERS_TO_FETCH.map(c => c.id),
  source: `https://activities.outdoors.org/s/activity-directory?chapters=${CHAPTERS_TO_FETCH.map(c => c.id).join(',')}`,
  count: trips.length,
  trips,
}, null, 2));

console.log(`Fetched ${chapterRecords.length} chapter + ${extraRecords.length} extra-program records (${records.length} unique), ${trips.length} upcoming. Wrote trips.json`);
trips.slice(0, 8).forEach(t => console.log(' -', t.dateText, '|', t.title, '|', t.activityType, '|', t.chapterName));
