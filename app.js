// EliteFit story prototype. Each screen has a hash (#today, #sleep...), and the story
// panel follows whatever screen is showing, so a tap inside the app moves the story too.
const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// [name, story line]; the flashback and the what if sit inside chapters 2 and 4
const chapters = [
  ['Setting up', 'Chapter 1 · Sun 11 Oct, evening'],
  ['A flashback', 'Chapter 2 · Mon 12 Oct, her first morning'],
  ['A short night', 'Chapter 2 · Wed 21 Oct, 06:40'],
  ['Her call', 'Chapter 3 · Wed 21 Oct'],
  ['The next morning', 'Chapter 4 · Thu 22 Oct, 06:50'],
  ['Feel awful, score high', 'Chapter 4 · What if'],
  ['Looking back', 'Chapter 5 · Sun 25 Oct'],
  ["Today in Revolut's style", 'Appendix'],
];
// [screen, chapter, caption]
const steps = [
  ['welcome', 0, "Marta is 34, lives in Madrid, and just signed up for a half marathon. The first screen says the one thing that's different: this app asks how she feels before it shows a score."],
  ['goal', 0, "She picks her race: Sun 6 Dec, aiming for 1:55:00. The goal comes first because the plan and every score after this are measured against it."],
  ['connect', 0, "Her Apple Watch is already linked and she can add a ring. The devices are drawn as things she owns, so it's clear where the numbers come from."],
  ['permissions', 0, "Before she allows anything, she sees what the app reads and what it never does. The second list is as big as the first on purpose."],
  ['how', 0, "Three cards, one step each, so she knows what tomorrow morning looks like. The last one is the promise: when she and the ring disagree, she decides."],
  ['membership', 0, "The price and the trial are in the headline, not the small print. Maybe later is a real way out, so she isn't pushed to pay before she's tried it. The price is my proposal: Garmin charges £6.99 for its extra tier. Ultra already bundles partner subscriptions, so EliteFit could be one of them."],
  ['first-morning', 1, "Back to her first morning, the day after she signed up. There's no score yet, because the app needs a week of nights to learn her usual. So the first week is all about how she feels, and her plan starts gently with mobility and yoga."],
  ['checkin', 2, "Ten days in, after a short night, Marta opens the app. Her score stays locked until she taps how she feels, so the number doesn't set her mood for her."],
  ['today', 2, "She said Great, her body says 46 Low. Both sit side by side, and the tempo run stays on because she feels fine. A lower answer would swap it for mobility."],
  ['sleep', 2, "Tapping the score opens last night: 5h 40m, 1h 50m under her goal. The dark screen is only for sleep, so it reads as night at a glance."],
  ['insight', 2, "The app explains the low score with her own 10 nights. It says how sure it is, and she can tell it whether that helped."],
  ['plan', 3, "Her plan still has the tempo run today, 2 × 15 min at 5:10/km. The week strip shows what's done and what's next, 6 weeks out."],
  ['session', 3, "She's 12:40 into the first block, a little slower than target. The screen offers to ease off but leaves the call to her."],
  ['done', 3, "Tempo done, 9.6 km. Asking how it felt right away gives tomorrow's check-in something to compare with."],
  ['today-next', 4, "Thursday, 06:50. She said Good and her score is back to 71 High, so the app tells her she called it. Today is strength."],
  ['disagree-low', 5, "This is a \"what if\" state, not one of Marta's real mornings. Say she feels awful but her ring says 87 Peak. The app goes with her, swaps the run for a walk and notes it in case she's getting ill. It doesn't guess what's wrong, it only says when to see a doctor."],
  ['sync-failed', 4, "Some mornings the ring doesn't sync. The screen stays calm and lets her go by how she feels, so a missing number doesn't stop her day."],
  ['trends', 6, "Sunday, looking back over two weeks. Her HRV dipped to 38 on 21 Oct and is back above her usual at 62."],
  ['agree', 6, "She and her ring agreed 11 of 12 mornings. The one they didn't is the morning she trusted herself, and it went fine. Based on how I grouped the scores: High and Peak count as a Good morning."],
  ['you', 6, "Her profile keeps the plain facts: her race, her devices, her membership. That's the end of Marta's first two weeks."],
  ['today-dark', 7, "Revolut's own app is dark and plain. I designed EliteFit warmer on purpose, so mornings feel softer. Here's Today in their style, to compare. I'd test both."],
];
const noTabs = ['welcome', 'goal', 'connect', 'permissions', 'how', 'membership', 'session', 'done'];
const tabOf = { 'first-morning': 'today', 'disagree-low': 'today', 'today-dark': 'today', checkin: 'today', today: 'today', sleep: 'today', insight: 'today', 'today-next': 'today', 'sync-failed': 'today', plan: 'plan', trends: 'trends', agree: 'trends', you: 'you' };
const clock = { checkin: '6:40', 'today-next': '6:50', 'sync-failed': '6:50' };
const feels = ['', 'Awful', 'Tired', 'Okay', 'Good', 'Great'];
const feelColor = ['', '#E8594F', '#F08A4B', '#F2A93B', '#8CCB5E', '#1FA971'];
const connected = new Set(['Apple Watch']);
let revealTimer;

function show(v) {
  let i = steps.findIndex(s => s[0] === v);
  if (i < 0) { i = 0; v = 'welcome'; }
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.dataset.view === v));
  $(`.screen[data-view="${v}"] .scroll`).scrollTop = 0;
  $('#tabs').classList.toggle('hide', noTabs.includes(v));
  document.querySelectorAll('.tab').forEach(t => t.dataset.tab === tabOf[v] ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current'));
  const dark = ['sleep', 'insight', 'today-dark'].includes(v);
  $('#tabs').classList.toggle('dark', v === 'today-dark');
  $('#status').classList.toggle('light', dark);
  $('#homebar').classList.toggle('light', dark);
  $('#clock').textContent = clock[v] || '9:41';
  if (v === 'checkin') resetLock();
  if (v === 'you') renderDevices();

  const [name, when] = chapters[steps[i][1]];
  $('#when').textContent = when;
  $('#chapter').textContent = name;
  $('#cap').textContent = steps[i][2];
  $('#count').textContent = `${i + 1} of ${steps.length}`;
  $('#bar').style.width = (i + 1) / steps.length * 100 + '%';
  // Back and Next are ordinary data-go buttons, so the click handler below drives them too.
  $('#back').disabled = i === 0;
  $('#back').dataset.go = steps[Math.max(0, i - 1)][0];
  $('#next').dataset.go = steps[(i + 1) % steps.length][0];
  $('#next').textContent = i === steps.length - 1 ? 'Start over' : 'Next';
}
function go(v) { location.hash === '#' + v ? show(v) : (location.hash = v); }
addEventListener('hashchange', () => show(location.hash.slice(1)));

document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) return go(g.dataset.go);
  const t = e.target.closest('[data-toast]');
  if (t) return toast(t.dataset.toast);
  const o = e.target.closest('.orb');
  if (o && o.closest('#orbs')) return pick(+o.dataset.feel, o);
  if (o) {
    o.parentNode.classList.add('picked');
    o.parentNode.querySelectorAll('.orb').forEach(b => { b.classList.toggle('sel', b === o); b.setAttribute('aria-pressed', b === o); });
    return;
  }
  const d = e.target.closest('[data-dev]');
  if (d && !connected.has(d.dataset.dev)) {
    connected.add(d.dataset.dev);
    d.classList.add('done');
    d.setAttribute('aria-pressed', 'true');
    d.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>Connected';
    return;
  }
  const f = e.target.closest('[data-fb]');
  if (f) {
    $('#fb').hidden = true;
    $('#thanks').textContent = f.dataset.fb;
    $('#thanks').hidden = false;
    return;
  }
  const r = e.target.closest('[role=group] [aria-pressed]');
  if (r) {
    r.parentNode.querySelectorAll('[aria-pressed]').forEach(b => b.setAttribute('aria-pressed', b === r));
    if (r.dataset.range) $('#rangeLbl').textContent = r.dataset.range;
    return;
  }
  if (e.target.closest('#pause')) {
    $('#pause').textContent = $('#pause').textContent === 'Pause' ? 'Resume' : 'Pause';
    return;
  }
  if (e.target.closest('#toggle')) {
    const min = $('#story').classList.toggle('min');
    $('#toggle').textContent = min ? 'Show' : 'Hide';
    $('#toggle').setAttribute('aria-expanded', !min);
  }
});

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// check-in: the score stays locked until she answers
function resetLock() {
  clearTimeout(revealTimer);
  $('#orbs').classList.remove('picked');
  document.querySelectorAll('#orbs .orb').forEach(o => { o.classList.remove('sel'); o.disabled = false; });
  $('#lock').classList.remove('reveal');
  $('#lockProg').style.strokeDashoffset = 640.9;
  $('#lockNum').textContent = '0';
  $('#hint').textContent = 'Your score shows after you answer.';
}
function pick(n, orb) {
  setFeel(n);
  $('#orbs').classList.add('picked');
  document.querySelectorAll('#orbs .orb').forEach(o => { o.classList.toggle('sel', o === orb); o.disabled = o !== orb; });
  $('#hint').textContent = `You feel ${feels[n]}. Here's what your body says.`;
  revealTimer = setTimeout(() => {
    $('#lock').classList.add('reveal');
    $('#lockProg').style.strokeDashoffset = 640.9 * (1 - .46);
    countUp($('#lockNum'), 46, reduce ? 0 : 1000);
    revealTimer = setTimeout(() => go('today'), reduce ? 600 : 1900);
  }, reduce ? 0 : 450);
}
function countUp(el, to, ms) {
  if (!ms) { el.textContent = to; return; }
  const t0 = performance.now();
  (function step(t) {
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}
// the run card follows the feel: Good or Great keeps the tempo run, anything lower swaps it
function setFeel(n) {
  const name = feels[n];
  const orb = $(`.orb[data-feel="${n}"]`);
  $('#youOrb').style.background = `linear-gradient(145deg,${orb.style.getPropertyValue('--c1')},${orb.style.getPropertyValue('--c2')})`;
  $('#youFeel').textContent = name;
  const keep = n >= 4;
  $('#sessTitle').textContent = keep ? 'Tempo run · 2 × 15 min' : 'Mobility · 20 min';
  $('#sessSub').textContent = keep ? `You feel ${name}, so it stays on` : `You feel ${name}, so we swapped it`;
  $('#planTitle').textContent = keep ? 'Tempo run' : 'Mobility';
  $('#planSub').textContent = keep ? '2 × 15 min at 5:10/km' : '20 min, easy, swapped from the tempo run';
  // only the tempo run opens the run screen; mobility just starts
  document.querySelectorAll('[data-run]').forEach(b => {
    if (keep) { b.dataset.go = 'session'; delete b.dataset.toast; }
    else { delete b.dataset.go; b.dataset.toast = 'Mobility started'; }
  });
}

function renderDevices() {
  $('#youDevs').innerHTML = ['Apple Watch', 'Oura Ring', 'Garmin'].map(d =>
    `<div class="li"><span class="t">${d}</span><em class="${connected.has(d) ? 'on' : ''}">${connected.has(d) ? 'Connected' : 'Not connected'}</em></div>`).join('');
}

// hypnogram: [stage, start min, end min] over 375 min (00:10 to 06:25)
(function () {
  const rows = { awake: [22, '#FFA36B'], rem: [64, '#5EE0E6'], light: [106, '#C9B8FF'], deep: [148, '#8A6CF5'] };
  const segs = [['light',0,20],['deep',20,50],['light',50,90],['awake',90,95],['rem',95,115],['light',115,155],['deep',155,185],['light',185,225],['awake',225,235],['rem',235,260],['light',260,300],['awake',300,310],['rem',310,335],['light',335,365],['awake',365,375]];
  const x = m => 8 + m / 375 * 264;
  let s = '<defs><filter id="hg" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
  Object.values(rows).forEach(([y]) => s += `<line x1="8" x2="272" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.07)"/>`);
  segs.forEach((g, i) => {
    const n = segs[i + 1];
    if (n) s += `<line x1="${x(g[2])}" x2="${x(g[2])}" y1="${rows[g[0]][0]}" y2="${rows[n[0]][0]}" stroke="rgba(255,255,255,.3)"/>`;
  });
  segs.forEach(([k, a, b]) => {
    const [y, c] = rows[k];
    s += `<rect x="${x(a) + .8}" y="${y - 5}" width="${Math.max(6, x(b) - x(a) - 1.6)}" height="10" rx="5" fill="${c}" filter="url(#hg)"/>`;
  });
  $('#hypno').innerHTML = s;
})();

// HRV chart, 12 to 25 Oct
(function () {
  const v = [56, 58, 54, 50, 57, 44, 52, 49, 58, 38, 47, 55, 59, 62];
  const X = i => 8 + i * (284 / 13), Y = n => 140 - (n - 30) / 40 * 130;
  const p = v.map((n, i) => [X(i), Y(n)]);
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
    d += ` C${b[0] + (c[0] - a[0]) / 6},${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6},${c[1] - (e[1] - b[1]) / 6} ${c[0]},${c[1]}`;
  }
  const last = p[p.length - 1];
  $('#chart').innerHTML = `
    <defs>
      <linearGradient id="ln" x1="0" x2="1"><stop offset="0" stop-color="#C9B8FF"/><stop offset=".5" stop-color="#FF9C7A"/><stop offset="1" stop-color="#FF7A57"/></linearGradient>
      <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9C7A" stop-opacity=".18"/><stop offset="1" stop-color="#FF9C7A" stop-opacity="0"/></linearGradient>
      <filter id="lg" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect x="0" y="${Y(60)}" width="300" height="${Y(50) - Y(60)}" rx="6" fill="rgba(255,255,255,.08)"/>
    <text x="4" y="${Y(50) + 13}" text-anchor="start" font-family="Inter,Arial,sans-serif" font-size="9" fill="rgba(255,255,255,.5)">Your usual</text>
    <path d="${d} L${last[0]},150 L${p[0][0]},150 Z" fill="url(#ar)"/>
    <path d="${d}" fill="none" stroke="url(#ln)" stroke-width="3" stroke-linecap="round" filter="url(#lg)"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="11" fill="#FF7A57" opacity=".35"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="5.5" fill="#fff" stroke="#FF7A57" stroke-width="2.5"/>`;
})();

// Plan countdown arc, halfway through the 12 weeks
(function () {
  const cx = 130, cy = 120, r = 100;
  const pt = a => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const arc = (a0, a1) => { const [x0, y0] = pt(a0), [x1, y1] = pt(a1); return `M${x0},${y0} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1}`; };
  const now = -120 + 240 * .5, [dx, dy] = pt(now), [fx, fy] = pt(120);
  $('#gauge').innerHTML = `
    <path d="${arc(-120, 120)}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="12" stroke-linecap="round"/>
    <path d="${arc(-120, now)}" fill="none" stroke="#fff" stroke-width="12" stroke-dasharray="14 6"/>
    <circle cx="${dx}" cy="${dy}" r="11" fill="#fff"/><circle cx="${dx}" cy="${dy}" r="6" fill="#F2542D"/>
    <circle cx="${fx + 6}" cy="${fy - 4}" r="14" fill="rgba(255,255,255,.6)"/>
    <path d="M${fx + 1},${fy + 3} v-14 h10 l-2 3.5 2 3.5 h-10" fill="none" stroke="#1E1530" stroke-width="1.7" stroke-linejoin="round"/>`;
})();

// Week strip, Mon 19 to Sun 25 Oct
(function () {
  const ic = {
    done: '<path d="m6 12.5 4 4L18 8" stroke-width="2.6"/>',
    run: '<circle cx="14" cy="4.5" r="1.8" fill="currentColor" stroke="none"/><path d="M8 21l3-6 3 2v4M7 11l3-3 4 1 2 3 3 1M11 15l-1-4"/>',
    lift: '<path d="M3 12h18M6 8v8M18 8v8M3.5 10v4M20.5 10v4"/>',
    rest: '<path d="M18 14.5A6.5 6.5 0 0 1 9.5 6a6.5 6.5 0 1 0 8.5 8.5z"/>'
  };
  const days = [['M',19,'done','Done'],['T',20,'done','Done'],['W',21,'run','Today, tempo run'],['T',22,'lift','Strength'],['F',23,'rest','Rest'],['S',24,'run','Easy run'],['S',25,'run','Long run']];
  $('#week').innerHTML = days.map(([l, n, k, a], i) =>
    `<div class="day ${k === 'done' ? 'done' : ''} ${i === 2 ? 'today' : ''}" aria-label="${n} Oct, ${a}"><small>${l}</small><b>${n}</b><span class="di"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ic[k]}</svg></span></div>`).join('');
})();

// You and your ring, 12 to 23 Oct
(function () {
  const you = [4, 4, 4, 3, 4, 2, 3, 3, 4, 5, 4, 4];
  const band = { Peak: 4, High: 4, Moderate: 3, Low: 2 };
  const ring = ['Peak','High','Peak','Moderate','High','Low','Moderate','Moderate','High','Low','High','High'];
  let s = '<span class="rl" style="grid-row:1;grid-column:1">You</span><span class="rl" style="grid-row:2;grid-column:1">Ring</span>';
  you.forEach((f, i) => {
    s += `<div class="col ${i === 9 ? 'hl' : ''}" style="grid-column:${i + 2}"><i style="--c:${feelColor[f]}"></i><i style="--c:${feelColor[band[ring[i]]]}"></i><span>${12 + i}</span></div>`;
  });
  $('#agrid').innerHTML = s;
})();

// fit the phone on short desktop screens; on phones the app is full screen
function fit() {
  const phone = innerWidth <= 500;
  const s = phone ? 1 : Math.min(1, (innerHeight - 48) / 864);
  $('#device').style.transform = s < 1 ? `scale(${s})` : '';
  $('#stage').style.width = phone ? '' : 390 * s + 'px';
  $('#stage').style.height = phone ? '' : 844 * s + 'px';
}
addEventListener('resize', fit);
fit();
setFeel(5);
show(location.hash.slice(1));
