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

const filtersJsonSpecs = JSON.stringify({
  additionalFilters: {
    audiences: '--all--',
    programTypes: '--all--',
    openForRegistration: false,
    noCostTrips: false,
    chapters: CHAPTER,
  },
});

const message = JSON.stringify({ actions: [{ id: '202;a',
  descriptor: 'aura://ApexActionController/ACTION$execute',
  callingDescriptor: 'UNKNOWN',
  params: { namespace: '', classname: 'OC_ActivitySearchController',
    method: 'searchForActivitiesApplyFilters',
    params: { filtersJsonSpecs },
    cacheable: false, isContinuation: false } }] });

const auraContext = JSON.stringify({ mode: 'PROD', fwuid: FWUID,
  app: 'siteforce:communityApp',
  loaded: { 'APPLICATION@markup://siteforce:communityApp': APP_TOKEN },
  dn: [], globals: {}, uad: true });

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

const res = await fetch('https://activities.outdoors.org/s/sfsites/aura', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
  body: new URLSearchParams({
    message,
    'aura.context': auraContext,
    'aura.pageURI': `/s/activity-directory?chapters=${CHAPTER}`,
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
const records = action.returnValue.returnValue || [];
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

const trips = records
  .filter(a => a.Start_Date__c && a.Start_Date__c >= today)
  .map(a => ({
    title: a.Activity_Name__c,
    date: a.Start_Date__c,
    time: a.Start_Time__c || '',
    dateText: a.Start_Concatenation_Formula_Unconverted__c || '',
    dateISO: toISO(a.Start_Date__c, a.Start_Time__c),
    activityType: a.Main_Activity_Type__c || '',
    subType: a.Main_Activity_Sub_Type__c || '',
    status: a.Status__c || '',
    leaders: (a.OC_Trip_Leaders__r || []).map(l => l.Contact__r && l.Contact__r.Name).filter(Boolean),
    location: a.Start_Location__c
      ? [a.Start_Location__c.city, a.Start_Location__c.state].filter(Boolean).join(', ') : '',
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
console.log(`Fetched ${records.length} records, ${trips.length} upcoming. Wrote trips.json`);
trips.slice(0, 8).forEach(t => console.log(' -', t.dateText, '|', t.title, '|', t.activityType));
