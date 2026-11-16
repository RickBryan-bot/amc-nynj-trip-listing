// AMC trip listing (LIST layout, no images) — hosted version. Loaded from the WordPress page with:
//   <div id="amc-trips-embed"></div>
//   <script src="https://rickbryan-bot.github.io/amc-nynj-trip-listing/embed-list.js"></script>
// Keeping the code in this file (instead of pasted into WordPress) means
// WordPress can never mangle it. Fetches trips.json from the same repo,
// falls back to the embedded snapshot if the fetch fails.
(function () {
  var css = `#amc-trips-embed{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#222;max-width:1100px;margin:0 auto}
#amc-trips-embed .amc-trips-hero{background:#14532d;color:#fff;border-radius:12px;padding:28px 28px 20px;margin-bottom:24px}
#amc-trips-embed .amc-trips-hero h2{margin:0 0 8px;font-size:28px;line-height:1.2;color:#fff}
#amc-trips-embed .amc-trips-note{margin:0 0 14px;opacity:.9}
#amc-trips-embed .amc-trips-note a{color:#cdeccd}
#amc-trips-embed .amc-trips-filter{width:100%;max-width:520px;padding:10px 14px;border:0;border-radius:8px;font-size:15px;margin-bottom:14px}
#amc-trips-embed .amc-trips-chips{display:flex;flex-wrap:wrap;gap:8px}
#amc-trips-embed .amc-trips-chip{background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:5px 12px;font-size:13px;cursor:pointer;text-decoration:none}
#amc-trips-embed .amc-trips-chip:hover{background:rgba(255,255,255,.3)}
#amc-trips-embed .amc-trips-section{margin:28px 0 8px;font-size:22px;color:#14532d;border-bottom:2px solid #14532d;padding-bottom:6px}
#amc-trips-embed .amc-trips-count{font-size:14px;color:#666;font-weight:400}
#amc-trips-embed .amc-trips-rows{margin-top:8px}
#amc-trips-embed .amc-trip-row{display:flex;gap:16px;padding:12px 4px;border-bottom:1px solid #e5e5e5;align-items:flex-start}
#amc-trips-embed .amc-trip-row:hover{background:#f7faf7}
#amc-trips-embed .amc-trip-row-date{flex:0 0 190px;font-weight:700;color:#14532d;font-size:14px;line-height:1.4}
#amc-trips-embed .amc-trip-row-time{display:block;font-weight:400;color:#555;font-size:13px}
#amc-trips-embed .amc-trip-row-main{flex:1;min-width:0}
#amc-trips-embed .amc-trip-row-title{font-size:16px;font-weight:700;line-height:1.3;color:#14532d;text-decoration:none}
#amc-trips-embed .amc-trip-row-title:hover{text-decoration:underline}
#amc-trips-embed .amc-trip-row-meta{font-size:14px;color:#555;margin:4px 0 0}
#amc-trips-embed .amc-trip-badge{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:2px 10px;margin-left:6px;vertical-align:middle}
#amc-trips-embed .amc-trip-badge.full{background:#fde8e8;color:#991b1b}
#amc-trips-embed .amc-trip-badge.waitlist{background:#fef3c7;color:#92400e}
#amc-trips-embed .amc-trips-empty{padding:24px;color:#555}
@media (max-width:600px){
  #amc-trips-embed .amc-trip-row{flex-direction:column;gap:2px}
  #amc-trips-embed .amc-trip-row-date{flex:none}
}`;
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);
  var root = document.getElementById("amc-trips-embed");
  if (!root) return;
  root.innerHTML = `<div class="amc-trips-hero">
    <h2>Upcoming Trips — AMC New York–North Jersey</h2>
    <p class="amc-trips-note" id="amc-trips-note">Loading trips…</p>
    <input class="amc-trips-filter" id="amc-trips-filter" type="search"
      placeholder="Filter by name, place, or leader — try Catskills or Harriman" aria-label="Filter trips">
    <div class="amc-trips-chips" id="amc-trips-chips"></div>
  </div>
  <div id="amc-trips-list"></div>`;
(function () {
  // >>> Replace this with your real GitHub Pages URL after the repo is set up,
  // e.g. 'https://amc-nynj.github.io/amc-nynj-trip-listing/trips.json'
  var TRIPS_URL = 'https://rickbryan-bot.github.io/amc-nynj-trip-listing/trips.json';
  var DIRECTORY_URL = 'https://activities.outdoors.org/s/activity-directory?chapters=0015000001Sg064AAB';
  var SECTION_ORDER = ['Hiking, Local Walks, & Trail Running', 'Social', 'Skiing',
    'Backpacking', 'Wilderness First Aid', 'Biking', 'Camping', 'Conservation'];
  var EMBEDDED = {"fetchedAt":"2026-11-16T16:08:02.032Z","chapter":"0015000001Sg064AAB","source":"https://activities.outdoors.org/s/activity-directory?chapters=0015000001Sg064AAB","count":16,"trips":[{"title":"Biking - Bethpage to Jones Beach on Bike Path and Quiet Roads","date":"2026-11-16","time":"10:30 AM","dateText":"Monday, November 16, 2026 | 10:30 AM","dateISO":"2026-11-16T10:30:00-05:00","activityType":"Biking","subType":"Road","programType":"Volunteer Led","status":"Published","leaders":["Brian Lownds"],"location":"Old Bethpage, NY","distanceMi":26.8,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001NBv32AG","image":"https://outdoors.my.salesforce.com/sfc/dist/version/renditionDownload?rendition=THUMB720BY480&versionId=068VX000011drUtYAI&d=%2Fa%2FVX000003x7wb%2Fx9pWZvcWF2YuUWIC9TAU7lRmte3hCBuIc8cZ026cST0&oid=00D50000000cBTwEAM","openForRegistration":true},{"title":"Harriman: Orak & Reservoirs - 8 Miles (Moderate)","date":"2026-11-18","time":"9:30 AM","dateText":"Wednesday, November 18, 2026 | 9:30 AM","dateISO":"2026-11-18T09:30:00-05:00","activityType":"Hiking, Local Walks, & Trail Running","subType":"Hiking","programType":"Volunteer Led","status":"Published","leaders":["Hank Zupnick"],"location":"NY","distanceMi":29.5,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001ND5d2AG","image":"https://activities.outdoors.org/resource/1745325135000/OC_DefaultActivityImage","openForRegistration":true},{"title":"AMC NY/NJ 20s and 30s Thirsty Thursday (Long Island City)","date":"2026-11-19","time":"6:30 PM","dateText":"Thursday, November 19, 2026 | 6:30 PM","dateISO":"2026-11-19T18:30:00-05:00","activityType":"Social","subType":"Local Socials","programType":"Volunteer Led","status":"Published","leaders":["John Power"],"location":"New York, NY","distanceMi":1.5,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001ND7F2AW","image":"https://outdoors.my.salesforce.com/sfc/dist/version/renditionDownload?rendition=THUMB720BY480&versionId=068VX00000kqDzZYAU&d=%2Fa%2FVX0000036PGX%2FUredcZu2y3SjGqc5g8oVeXI8owGKm3yZ.WKijo.dS60&oid=00D50000000cBTwEAM","openForRegistration":true},{"title":"Shirley Chisholm State Park Shore Clean Up & Hike with NYS Parks & AMC","date":"2026-11-21","time":"9:45 AM","dateText":"Saturday, November 21, 2026 | 9:45 AM","dateISO":"2026-11-21T09:45:00-05:00","activityType":"Conservation","subType":"Conservation","programType":"Volunteer Led","status":"Published","leaders":["Eileen Yin"],"location":"New York, NY","distanceMi":10.5,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001Jf3h2AC","image":"https://outdoors.my.salesforce.com/sfc/dist/version/renditionDownload?rendition=THUMB720BY480&versionId=068VX00000pKV3uYAG&d=%2Fa%2FVX000003LFgf%2FDUnPeV2AsD5e0A539TAejIQOZM70IeKsp6voTak0QKs&oid=00D50000000cBTwEAM","openForRegistration":true},{"title":"Downtown Manhattan Phone Photo Walk & free Nutcracker Ballet","date":"2026-11-21","time":"9:45 AM","dateText":"Saturday, November 21, 2026 | 9:45 AM","dateISO":"2026-11-21T09:45:00-05:00","activityType":"Hiking, Local Walks, & Trail Running","subType":"Local Walks","programType":"Volunteer Led","status":"Published","leaders":["Rebeca Galbinski"],"location":"New York, NY","distanceMi":4.5,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001N8kH2AS","image":"https://outdoors.my.salesforce.com/sfc/dist/version/renditionDownload?rendition=THUMB720BY480&versionId=068VX000011HHzZYAW&d=%2Fa%2FVX000003wXUv%2FoVBBoBkKx67NR49GSFPI5GPZu1p8odkfDGwoRHtS31s&oid=00D50000000cBTwEAM","openForRegistration":true},{"title":"Rockefeller Lookout with Fort Lee Historic Park and Carpenter's Stairs (Vigorous)","date":"2026-11-21","time":"10:00 AM","dateText":"Saturday, November 21, 2026 | 10:00 AM","dateISO":"2026-11-21T10:00:00-05:00","activityType":"Hiking, Local Walks, & Trail Running","subType":"Local Walks","programType":"Volunteer Led","status":"Published","leaders":["Tom Bergen"],"location":"New York, NY","distanceMi":5.9,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001ND2P2AW","image":"https://outdoors.my.salesforce.com/sfc/dist/version/renditionDownload?rendition=THUMB720BY480&versionId=068VX000011jAwdYAE&d=%2Fa%2FVX000003xGGj%2FqJADFFlgw1eDYDlisIBRJNAUIFCUs5HDv6eEeN_jDwA&oid=00D50000000cBTwEAM","openForRegistration":true},{"title":"20S & 30S ANTHONY'S NOSE HIKE (STRENUOUS)","date":"2026-11-21","time":"10:00 AM","dateText":"Saturday, November 21, 2026 | 10:00 AM","dateISO":"2026-11-21T10:00:00-05:00","activityType":"Hiking, Local Walks, & Trail Running","subType":"Hiking","programType":"Volunteer Led","status":"Published","leaders":["John Power"],"location":"Peekskill, NY","distanceMi":36,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001ND8r2AG","image":"https://activities.outdoors.org/resource/1745325135000/OC_DefaultActivityImage","openForRegistration":true},{"title":"2nd Annual Friendsgiving Phone Photo Walk: from LIC Queens to Greenpoint Brooklyn","date":"2026-11-28","time":"11:00 AM","dateText":"Saturday, November 28, 2026 | 11:00 AM","dateISO":"2026-11-28T11:00:00-05:00","activityType":"Hiking, Local Walks, & Trail Running","subType":"Local Walks","programType":"Volunteer Led","status":"Published","leaders":["Rebeca Galbinski"],"location":"Long Island City, NY","distanceMi":1.8,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001N5G92AK","image":"https://outdoors.my.salesforce.com/sfc/dist/version/renditionDownload?rendition=THUMB720BY480&versionId=068VX0000117rwCYAQ&d=%2Fa%2FVX000003wC3t%2FqLDKhXJSXBN_kWKCyc3nySCOeLqhaygbEK1Lm6Z1NhA&oid=00D50000000cBTwEAM","openForRegistration":true},{"title":"Sterling Forest Fire Tower and Sterling Ridge Loop Hike! 8 miles (Vigorous)","date":"2026-12-09","time":"9:00 AM","dateText":"Wednesday, December 9, 2026 | 9:00 AM","dateISO":"2026-12-09T09:00:00-05:00","activityType":"Hiking, Local Walks, & Trail Running","subType":"Hiking","programType":"Volunteer Led","status":"Published","leaders":["Anastasia Tavarez"],"location":"Tuxedo Park, NY","distanceMi":33,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001MvqH2AS","image":"https://outdoors.my.salesforce.com/sfc/dist/version/renditionDownload?rendition=THUMB720BY480&versionId=068VX000010yZnCYAU&d=%2Fa%2FVX000003vbQv%2F14VbPJvUP8WN5IC_Kr4z6CH0H13vszP1C5wePatnEBw&oid=00D50000000cBTwEAM","openForRegistration":true},{"title":"Beacon to Bald Hill Hike (Vigorous)","date":"2026-12-12","time":"9:00 AM","dateText":"Saturday, December 12, 2026","dateISO":"2026-12-12T09:00:00-05:00","activityType":"Hiking, Local Walks, & Trail Running","subType":"Hiking","programType":"Volunteer Led","status":"Full","leaders":["Timothy Watters"],"location":"Beacon, NY","distanceMi":50.4,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001DFrt2AG","image":"https://activities.outdoors.org/resource/1745325135000/OC_DefaultActivityImage","openForRegistration":true},{"title":"NY-NoJ Holiday Party 2026","date":"2026-12-16","time":"7:00 PM","dateText":"Wednesday, December 16, 2026 | 7:00 PM","dateISO":"2026-12-16T19:00:00-05:00","activityType":"Social","subType":"Local Socials","programType":"Volunteer Led","status":"Published","leaders":["John Power"],"location":"New York, NY","distanceMi":1.5,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001N67N2AS","image":"https://outdoors.my.salesforce.com/sfc/dist/version/renditionDownload?rendition=THUMB720BY480&versionId=068VX0000119bH8YAI&d=%2Fa%2FVX000003wHwP%2FJewmxCQqsONwPEyBykGWRExcyJHbtAehU9_aMDWfFGY&oid=00D50000000cBTwEAM","openForRegistration":true},{"title":"Winter Solstice Phone Photo Walk: Bookstores with Coffee Shops in Manhattan","date":"2026-12-20","time":"12:00 PM","dateText":"Sunday, December 20, 2026 | 12:00 PM","dateISO":"2026-12-20T12:00:00-05:00","activityType":"Hiking, Local Walks, & Trail Running","subType":"Local Walks","programType":"Volunteer Led","status":"Published","leaders":["Rebeca Galbinski"],"location":"New York, NY","distanceMi":1.5,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001N8XN2A0","image":"https://outdoors.my.salesforce.com/sfc/dist/version/renditionDownload?rendition=THUMB720BY480&versionId=068VX000011GPERYA4&d=%2Fa%2FVX000003wUon%2FzfjLfNLlwkSPYHHuKbErMMmqOu4lrc3AZP9_1eIR.yI&oid=00D50000000cBTwEAM","openForRegistration":true},{"title":"Annual NY-NoJ Leaders get together","date":"2027-01-30","time":"9:30 AM","dateText":"Saturday, January 30, 2027 | 9:30 AM","dateISO":"2027-01-30T09:30:00-05:00","activityType":"Social","subType":"Local Socials","programType":"Volunteer Led","status":"Published","leaders":["Ed Spirko"],"location":"Mahwah, NJ","distanceMi":23.8,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001NCG12AO","image":"https://activities.outdoors.org/resource/1745325135000/OC_DefaultActivityImage","openForRegistration":true},{"title":"Wilderness First Aid","date":"2027-03-27","time":"8:30 AM","dateText":"Saturday, March 27, 2027 | 8:30 AM","dateISO":"2027-03-27T08:30:00-05:00","activityType":"Wilderness First Aid","subType":"Wilderness First Aid","programType":"Volunteer Led","status":"Published","leaders":["Richard Dabal"],"location":"Ringwood, NJ","distanceMi":27.2,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001N4bp2AC","image":"https://outdoors.my.salesforce.com/sfc/dist/version/renditionDownload?rendition=THUMB720BY480&versionId=068VX00000e79xNYAQ&d=%2Fa%2FVX000002g8o1%2FEACVe_ZNP8vthLPnAEcdAB6DNy7Uzi.vvSScyuf0BZY&oid=00D50000000cBTwEAM","openForRegistration":false},{"title":"Wilderness First Aid","date":"2027-04-24","time":"8:30 AM","dateText":"Saturday, April 24, 2027 | 8:30 AM","dateISO":"2027-04-24T08:30:00-05:00","activityType":"Wilderness First Aid","subType":"Wilderness First Aid","programType":"Volunteer Led","status":"Published","leaders":["Richard Dabal"],"location":"Ringwood, NJ","distanceMi":27.2,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001N4wn2AC","image":"https://outdoors.my.salesforce.com/sfc/dist/version/renditionDownload?rendition=THUMB720BY480&versionId=068VX00000e79xNYAQ&d=%2Fa%2FVX000002g8o1%2FEACVe_ZNP8vthLPnAEcdAB6DNy7Uzi.vvSScyuf0BZY&oid=00D50000000cBTwEAM","openForRegistration":false},{"title":"NOLS Wilderness First Aid - NY/NJ","date":"2027-05-22","time":"8:00 AM","dateText":"Saturday, May 22, 2027 | 8:00 AM","dateISO":"2027-05-22T08:00:00-05:00","activityType":"Wilderness First Aid","subType":"Wilderness First Aid","programType":"Professional Guides","status":"Published","leaders":["AMC Outdoor Learning"],"location":"Haverstraw, NY","distanceMi":30.9,"url":"https://activities.outdoors.org/s/oc-activity/a5UVX000001MPaH2AW","image":"https://outdoors.my.salesforce.com/sfc/dist/version/renditionDownload?rendition=THUMB720BY480&versionId=068VX0000100sZRYAY&d=%2Fa%2FVX000003snEv%2FJvea5Z14mFVkLN3vEaRKFYBeLYcGRw.h5MnpxyIWRWQ&oid=00D50000000cBTwEAM","openForRegistration":true}]};

  var root = document.getElementById('amc-trips-embed');
  var listEl = document.getElementById('amc-trips-list');
  var noteEl = document.getElementById('amc-trips-note');
  var chipsEl = document.getElementById('amc-trips-chips');
  var filterEl = document.getElementById('amc-trips-filter');
  var trips = [];
  var live = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function sectionId(name) {
    return 'amc-sec-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  function render() {
    var q = (filterEl.value || '').toLowerCase();
    var grouped = {};
    trips.forEach(function (t) {
      var hay = [t.title, t.location, (t.leaders || []).join(' '), t.activityType].join(' ').toLowerCase();
      if (q && hay.indexOf(q) === -1) return;
      (grouped[t.activityType] = grouped[t.activityType] || []).push(t);
    });
    var html = '';
    var shown = 0;
    SECTION_ORDER.forEach(function (sec) {
      var items = grouped[sec];
      if (!items || !items.length) return;
      shown += items.length;
      html += '<h3 class="amc-trips-section" id="' + sectionId(sec) + '">' + esc(sec) +
        ' <span class="amc-trips-count">(' + items.length + ')</span></h3><div class="amc-trips-rows">';
      items.forEach(function (t) {
        var badge = '';
        if (t.status === 'Full') badge = '<span class="amc-trip-badge full">Full</span>';
        else if (t.status === 'Waitlist') badge = '<span class="amc-trip-badge waitlist">Waitlist</span>';
        var dt = (t.dateText || '').split(' | ');
        var meta = esc(t.subType || t.activityType) +
          (t.leaders && t.leaders.length ? ' · Led by ' + esc(t.leaders.join(', ')) : '') +
          (t.location ? ' · ' + esc(t.location) : '') +
          (t.distanceMi != null ? ' · ' + esc(t.distanceMi) + ' mi' : '');
        html += '<div class="amc-trip-row">' +
          '<div class="amc-trip-row-date">' + esc(dt[0]) + badge +
          (dt[1] ? '<span class="amc-trip-row-time">' + esc(dt[1]) + '</span>' : '') + '</div>' +
          '<div class="amc-trip-row-main">' +
          '<a class="amc-trip-row-title" href="' + esc(t.url) + '">' + esc(t.title) + '</a>' +
          '<p class="amc-trip-row-meta">' + meta + '</p>' +
          '</div></div>';
      });
      html += '</div>';
    });
    listEl.innerHTML = html || '<p class="amc-trips-empty">No trips match that filter.</p>';
    chipsEl.innerHTML = SECTION_ORDER.filter(function (s) { return grouped[s]; }).map(function (s) {
      return '<a class="amc-trips-chip" href="#' + sectionId(s) + '">' + esc(s) + ' (' + grouped[s].length + ')</a>';
    }).join('');
    noteEl.innerHTML = live
      ? 'Updated ' + esc(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })) +
        ' · ' + trips.length + ' upcoming trips · <a href="' + DIRECTORY_URL + '">See the full live directory</a>'
      : 'Snapshot from November 16, 2026 · ' + trips.length + ' upcoming trips · ' +
        '<a href="' + DIRECTORY_URL + '">See the full live directory</a>';
  }
  filterEl.addEventListener('input', render);
  fetch(TRIPS_URL)
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) { trips = data.trips || []; live = true; render(); })
    .catch(function () { trips = EMBEDDED.trips || []; live = false; render(); });
})();
})();
