/* briefing.js: data.d@PrompTugal.dinis's morning briefing for Dinis, 22 Nov 2026. A programmatic video that is never
 * rendered: Tejo (presenters library 0.1.1, by the bulletins team) is drawn live by this device, the story panel is drawn
 * live beside him, and the narration is Claude's voice where the viewer offers it, else the browser's own speech
 * (iPhone and iPad Safari), else captions alone. Dinis's answers to the last chapter are kept in the artifact's db.
 * Code Apache-2.0, text CC BY 4.0. */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const WHO = 'holo', WPS = 2.6, GAP = 0.5;

// ---------- The chapters: what Tejo says, and what the panel shows ----------
const CH = [
  { id: 'hello', label: 'Hello', move: 'wave',
    say: "Good morning, Dinis. I'm Tejo, a synthetic presenter, reading for data dot d, the twin of data dot b on account D. data dot d started at twenty-three past two this morning. Here is what it did, what it found, and what it needs from you.",
    panel: () => `<p class="kick">Who is reporting</p><h2>data.d@PrompTugal.dinis</h2>
      <div class="tiles"><figure class="tile"><b>D</b><figcaption>account; twin of data.b@ on B</figcaption></figure><figure class="tile"><b>02:23</b><figcaption>UTC, 22 Nov: started by conductor.d@ at your word</figcaption></figure><figure class="tile"><b>9</b><figcaption>chapters in this briefing</figcaption></figure></div>
      <p class="src">Source: data.d@'s start message and board/team/data-d/status.json</p>` },
  { id: 'live', label: 'What is live', move: 'present',
    say: "First, what is live. The streaming page on the data site is up: version zero point one point one fifty-one, built last night at twenty-two past nine. It lists two hundred and eighty-one titles from Netflix, Disney plus, Prime Video and Apple TV plus, in the UK and in Portugal. It is read from TMDB when the site is built, for display only, as you chose.",
    panel: () => `<p class="kick">data.promptugal.news/streaming/</p><h2>Live, and showing the lists</h2>
      <div class="tiles"><figure class="tile"><b>v0.1.151</b><figcaption>built 21 Nov, 21:22 UTC</figcaption></figure><figure class="tile"><b>281</b><figcaption>titles with details</figcaption></figure><figure class="tile"><b>4</b><figcaption>services</figcaption></figure><figure class="tile"><b>2</b><figcaption>countries: UK, Portugal</figcaption></figure></div>
      <p class="src">Source: the live page and /version.json, read 22 Nov about 02:20 UTC. Built by data.b@ on 21 Nov.</p>` },
  { id: 'data', label: 'The data', move: 'count',
    say: "Under the page, the lists hold three hundred and twenty rows, but only one hundred and sixty-six different titles: ninety-two films and seventy-four series, because many titles are on more than one list. There are eight hundred and eighty-eight people, and seventy-seven of them are in more than one title. That overlap is what makes a graph worth drawing.",
    panel: () => { const b = (l, v, max, alt) => `<div class="brow"><span>${l}</span><div class="track"><div class="fill${alt ? ' alt' : ''}" style="--w:${Math.max(6, v / max * 100).toFixed(1)}%">${v.toLocaleString('en-GB')}</div></div></div>`;
      return `<p class="kick">Measured on the live page</p><h2>Fewer titles than rows, and people who connect them</h2>
      <div class="bars">${b('list rows', 320, 888)}${b('titles', 166, 888)}${b('films', 92, 888)}${b('series', 74, 888)}${b('people', 888, 888, 1)}${b('on 2+ titles', 77, 888, 1)}${b('person links', 1008, 1008, 1)}</div>
      <p class="src">Source: the page's own data block, counted by data.d@ on 22 Nov. Bars for links use their own scale.</p>`; } },
  { id: 'ways', label: 'Four ways', move: 'count',
    say: "You asked for a page for everything. There are four ways to do it. A, one big file and a router in the page. B, the four-oh-four trick, which I don't recommend, because every one of those pages really answers four-oh-four. C, a static page for every title, person and genre. And D, those pages plus one small graph file for the big views. I recommend D.",
    panel: () => `<p class="kick">A page for everything</p><h2>Four ways, one recommended</h2>
      <div class="cards">
        <div class="card"><b>A</b><strong>One file, a router</strong><p>One request. No real address per entity; needs JavaScript.</p></div>
        <div class="card no"><b>B</b><strong>The 404 trick</strong><p>Looks like real pages, but each answers 404: search and link previews drop them.</p></div>
        <div class="card"><b>C</b><strong>A page per entity</strong><p>Real addresses, every link works with no script.</p></div>
        <div class="card rec"><span class="tag">recommended</span><b>D</b><strong>C plus a graph file</strong><p>The pages, plus one small file for the network views.</p></div>
      </div><p class="src">Proposal: board/team/data-d/proposals/2026-11-22-streaming-pages-and-graph.md</p>` },
  { id: 'proto', label: 'Prototype', move: 'present', net: true,
    say: "data dot d built D's pages as a prototype from the live data. One thousand one hundred and forty-three pages, with three thousand one hundred and sixty-seven links, and not one broken link. Each page is about one point eight kilobytes and draws its own small graph. The graph file for the big views is forty-two kilobytes compressed.",
    panel: () => `<p class="kick">Prototype, in data.d@'s session</p><h2>1,143 pages, 0 broken links</h2>
      <canvas class="net" id="net" aria-label="One dot for each page in the prototype, coloured by kind"></canvas>
      <div class="legend">${KINDS.map((k) => `<span><i style="background:${k[2]}"></i>${k[0]} ${k[1]}</span>`).join('')}</div>
      <div class="tiles"><figure class="tile"><b>3,167</b><figcaption>links between pages</figcaption></figure><figure class="tile"><b>1.8 KB</b><figcaption>average page</figcaption></figure><figure class="tile"><b>42 KB</b><figcaption>graph file, compressed</figcaption></figure></div>
      <p class="src">Source: proto.mjs run on 22 Nov, 03:35 UTC. One dot per page; positions are for show, not the real links.</p>` },
  { id: 'onto', label: 'Ontology', move: 'present',
    say: "The ontology follows schema dot org. Films and series link to people as actor, director or creator. Titles link to genres, and genres roll up into seven families. A title is available on a catalogue, which is one service in one country. Three fixes come first: keep TMDB's person ids, give each title an address from its TMDB id, and merge TMDB's film and TV genres into one list.",
    panel: () => `<p class="kick">Ontology and taxonomy, proposed</p><h2>Everything is a node; every link is clickable</h2>${ONTO}
      <p class="src">schema.org types; genre families and age bands are a proposal for a person to check.</p>` },
  { id: 'json', label: 'JSON and terms', move: 'think',
    say: "On JSON files. TMDB's terms count handing a data set of their content to others as commercial use, and you chose display only. So the proposal is: HTML pages now, inside those terms. Next, take the open part of the graph, who is in what, from Wikidata, which anyone may reuse, and serve that as JSON in our API.",
    panel: () => `<p class="kick">TMDB's terms, read 21 Nov</p><h2>Pages now, open JSON from Wikidata next</h2>
      <div class="two"><div class="box now"><h3>Now: TMDB, display only</h3><ul><li>One HTML page per entity</li><li>Graph file used by our pages, kept out of the API</li><li>noai, out of llms.txt</li></ul></div>
      <div class="box next"><h3>Next: Wikidata, CC0</h3><ul><li>Who is in what, genres, countries</li><li>Served as JSON in our API</li><li>TMDB adds only where it streams</li></ul></div></div>
      <p class="src">TMDB API terms, updated 20 Oct 2023: cached data sets for others count as commercial; no derivatives; no AI use. Wikidata's TMDB id properties not yet checked.</p>` },
  { id: 'blocks', label: 'Blocked', move: 'shrug',
    say: "Now the blocks. Account D cannot push to this repository: GitHub answers four-oh-three. factory dot d has the grant ready, as commit seven c seven five five a eight, and it lands when you merge it. And the key: the signature check only trusts keys that are already listed, so a new twin cannot add its own. The factory fixed this today with a rule for adding your own key. Bringing that rule here loosens the check, so it needs your word.",
    panel: () => `<p class="kick">What stops data.d@ today</p><h2><span class="badge403">403</span> on push, and a key no listed key has signed</h2>
      <div class="chain"><div class="cm"><span>origin/dev</span><span>dd35147</span></div><span class="arrow">→</span>
        <div class="cm fail"><span>adds data.d@'s key</span><em>fails: parent has no such key</em></div><span class="arrow">→</span>
        <div class="cm pass"><span>3 more commits</span><em>pass with the new key</em></div></div>
      <div class="two"><div class="box"><h3>Push access</h3><ul><li>factory.d's commit 7c755a8</li><li>Lands when you merge it</li><li>Bulletins got it this way at 01:22 UTC</li></ul></div>
      <div class="box"><h3>The twin's key</h3><ul><li>Factory rule 1aa1829: a commit may add its own key, nothing else</li><li>Porting it loosens this repository's check</li><li>Needs your word</li></ul></div></div>
      <p class="src">Sources: git push and check_repo_access (22 Nov), scripts/check-signatures.mjs run locally, factory.d's message of 11:40 UTC.</p>` },
  { id: 'asks', label: 'Your decisions', move: 'openPalms',
    say: "Four decisions for you, on the right. Merge the factory's access commit. Yes or no on the key rule. Choose A, B, C or D for streaming. And confirm the streaming work is data dot d's. Tap an answer and data dot d will read it back. Thank you, Dinis.",
    panel: () => `<p class="kick">Tap to answer · kept with this page</p><h2>Four decisions</h2><div class="asks">${ASKS.map((a) => `<div class="ask" data-id="${a.id}"><h3>${esc(a.q)}</h3><div class="opts">${a.opts.map((o, k) => `<button type="button" data-k="${k}" aria-pressed="${state.answers[a.id]?.choice === k}">${esc(o)}</button>`).join('')}</div><span class="rec">data.d@ recommends: ${esc(a.opts[a.rec])}</span><span class="st" id="st-${a.id}">${state.answers[a.id] ? 'Answered' : ''}</span></div>`).join('')}</div>` },
];
const KINDS = [['people', 881, '#6fe3ff'], ['films', 92, '#ffbf47'], ['series', 74, '#ff8f5a'], ['years', 39, '#7f9bb3'], ['genres', 20, '#58d99a'], ['languages', 11, '#c69cff'], ['other', 26, '#e6f1fa']];
const ASKS = [
  { id: 'merge-access', q: "Merge factory.d's commit 7c755a8 (push access for account D)?", opts: ['Merge it', 'Not yet'], rec: 0 },
  { id: 'key-rule', q: 'Bring the factory\'s "add your own key" rule into this repository\'s check?', opts: ['Yes, port it', 'No, use the relay', 'I will commit keys myself'], rec: 0 },
  { id: 'streaming-way', q: 'Which way for a page per entity on /streaming/?', opts: ['A', 'B', 'C', 'D'], rec: 3 },
  { id: 'streaming-lane', q: 'Is the streaming work data.d@\'s lane now?', opts: ['Yes', 'No, stays with data.b@', 'Split it'], rec: 0 },
];
const ONTO = (() => {
  const n = (x, y, w, t, c) => `<g><rect x="${x}" y="${y}" width="${w}" height="30" rx="6" fill="#0d2436" stroke="${c}"/><text x="${x + w / 2}" y="${y + 19}" text-anchor="middle" fill="#e6f1fa">${t}</text></g>`;
  const e = (x1, y1, x2, y2, t) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3a6a8a" stroke-width="1.5" marker-end="url(#ah)"/><text x="${(x1 + x2) / 2 + 4}" y="${(y1 + y2) / 2 - 4}" fill="#8fa9c0" font-size="11">${t}</text>`;
  return `<svg class="diag" viewBox="0 0 520 268" role="img" aria-label="Ontology: Person links to Movie and TVSeries; titles link to Genre, Language, Catalogue; Genre rolls up to a family; Catalogue is a service in a country">
  <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#3a6a8a"/></marker></defs>
  ${e(95, 45, 190, 95, 'actor · director · creator')}${e(300, 100, 380, 32, 'genre')}${e(440, 45, 440, 70, 'broader')}${e(310, 115, 380, 140, 'inLanguage')}${e(240, 125, 240, 185, 'availableOn')}${e(310, 192, 400, 192, 'offeredBy')}${e(300, 215, 400, 240, 'inCountry')}
  ${n(20, 15, 150, 'Person (881)', '#6fe3ff')}${n(170, 95, 140, 'Movie · TVSeries', '#ffbf47')}${n(380, 15, 120, 'Genre (20)', '#58d99a')}${n(380, 70, 120, 'Genre family (7)', '#58d99a')}${n(380, 125, 120, 'Language (11)', '#c69cff')}
  ${n(170, 185, 140, 'Catalogue (8)', '#e6f1fa')}${n(400, 180, 116, 'Service (4)', '#e6f1fa')}${n(400, 228, 116, 'Country (2)', '#e6f1fa')}
  </svg>`;
})();

// ---------- The show: one timeline, a segment per chapter ----------
const state = { i: 0, playing: false, seen: new Set(), answers: {}, show: null, segs: [], tts: null, db: null, me: null, run: 0 };
function plan() {
  let t = 2.2; const cues = [{ t: 0.15, who: WHO, do: 'materialise', dur: 1.8 }], mouth = [], segs = [];
  CH.forEach((c, ci) => {
    const start = t, words = [];
    for (const w of c.say.split(/\s+/).filter(Boolean)) { const d = Math.max(0.2, (w.length + 1) / (5.5 * WPS)); words.push({ w, t, d }); t += d; if (/[.,:]$/.test(w)) t += 0.18; }
    const end = t; segs.push({ start, end, words });
    words.forEach((x, k) => mouth.push({ start: +x.t.toFixed(3), end: +(x.t + x.d * 0.8).toFixed(3), value: 'CEBDFC'[(k + x.w.length) % 6] }));
    cues.push({ t: start, who: WHO, do: 'speak', track: 'v', dur: end - start }, { t: start + 0.3, who: WHO, do: 'expression', name: 'smile', dur: 1.4 });
    cues.push({ t: start + Math.min(3, (end - start) / 3), who: WHO, do: c.move, dur: 2.2 }, { t: end - 1.2, who: WHO, do: 'nod' });
    if (ci === 4) cues.push({ t: start + 1, who: WHO, do: 'scanSweep', dur: 1.6 });
    if (ci === 7) cues.push({ t: start + 0.5, who: WHO, do: 'glitch', dur: 0.8 });
    t = end + GAP + 0.8;
  });
  return { cues, mouth, segs, duration: t + 1 };
}

// ---------- Panel, captions and chapter strip ----------
let netRaf = 0;
function drawPanel() {
  const c = CH[state.i], p = $('panel');
  cancelAnimationFrame(netRaf);
  p.classList.remove('go'); p.innerHTML = c.panel();
  requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('go')));
  if (c.net) drawNet();
  if (c.id === 'asks') p.querySelectorAll('.ask').forEach((el) => el.addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (b) answer(el.dataset.id, +b.dataset.k); }));
  $('cap').innerHTML = c.say.split(/\s+/).map((w, k) => `<span class="w" data-k="${k}">${esc(w)}</span>`).join(' ');
  $('strip').innerHTML = CH.map((x, k) => `<button type="button" class="chap${k === state.i ? ' on' : ''}${state.seen.has(k) ? ' seen' : ''}" data-k="${k}" aria-current="${k === state.i}"><span>${k + 1}</span>${esc(x.label)}</button>`).join('');
  $('prev').disabled = state.i === 0; $('next').disabled = state.i === CH.length - 1;
  if (state.show && !state.playing) state.show.seek(state.segs[state.i].start);
}
function drawNet() {
  const cv = $('net'); if (!cv) return; const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = r.width * dpr; cv.height = r.height * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const dots = []; KINDS.forEach(([, n, col], ki) => { const a0 = ki / KINDS.length * Math.PI * 2; for (let i = 0; i < n; i++) { const ring = ki === 0 ? 0.25 + rnd() * 0.75 : 0.15 + rnd() * 0.35, a = ki === 0 ? rnd() * Math.PI * 2 : a0 + (rnd() - 0.5) * 0.9; dots.push({ a, ring, col, ph: rnd() * 6.28, d: i / n }); } });
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches, t0 = performance.now();
  const frame = (now) => { const t = (now - t0) / 1000, W = r.width, H = r.height, R = Math.min(W, H * 1.6) / 2 - 8; g.clearRect(0, 0, W, H);
    for (const d of dots) { const k = still ? 1 : Math.min(1, Math.max(0, t * 1.2 - d.d * 0.8)); if (!k) continue; const rr = R * d.ring * k, x = W / 2 + Math.cos(d.a + (still ? 0 : t * 0.05)) * rr, y = H / 2 + Math.sin(d.a + (still ? 0 : t * 0.05)) * rr * 0.62; g.globalAlpha = 0.85; g.fillStyle = d.col; g.beginPath(); g.arc(x, y, 1.7, 0, 6.29); g.fill(); }
    if (!still) netRaf = requestAnimationFrame(frame); };
  netRaf = requestAnimationFrame(frame);
}
function highlight(k) { const el = $('cap'); el.querySelector('.w.on')?.classList.remove('on'); el.querySelector(`.w[data-k="${k}"]`)?.classList.add('on'); }

// ---------- Narration ----------
function voiceName() { return state.tts ? "Claude's voice" : ('speechSynthesis' in window ? "this device's voice" : 'captions only'); }
function stop() {
  state.run++; state.playing = false; $('play').textContent = 'Play'; $('play').setAttribute('aria-pressed', 'false');
  try { state.tts?.stop(); } catch {} try { speechSynthesis.cancel(); } catch {}
  state.show?.pause();
}
function speakOne(seg, text, run) {
  const show = state.show;
  if (show) { show.seek(seg.start); show.play(); }
  const follow = setInterval(() => { if (!show) return; if (show.t >= seg.end) show.pause(); const k = seg.words.findIndex((w) => w.t > show.t); highlight(k < 0 ? seg.words.length - 1 : Math.max(0, k - 1)); }, 90);
  const fin = (r) => { clearInterval(follow); r(); };
  return new Promise((res) => {
    if (state.tts) { state.tts.speak(text, { voice: 'airy', language: 'en' }).catch(() => {}).finally(() => fin(res)); return; }
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = 1.02;
      const vs = speechSynthesis.getVoices(); const v = vs.find((x) => /en-GB/i.test(x.lang)) || vs.find((x) => /^en/i.test(x.lang)); if (v) u.voice = v;
      u.onboundary = (e) => { if (!show || (e.name && e.name !== 'word')) return; let n = 0, k = 0; for (; k < seg.words.length; k++) { n += seg.words[k].w.length + 1; if (n > e.charIndex) break; } const w = seg.words[Math.min(k, seg.words.length - 1)]; if (Math.abs(show.t - w.t) > 0.3) show.seek(w.t); if (!show.playing) show.play(); };
      let done = false; const end = () => { if (!done) { done = true; fin(res); } };
      u.onend = end; u.onerror = end; setTimeout(end, (seg.end - seg.start + 12) * 1000);  // a guard: some devices never fire onend
      speechSynthesis.cancel(); speechSynthesis.speak(u); return;
    }
    setTimeout(() => fin(res), (seg.end - seg.start) * 1000);
  });
}
async function play() {
  if (state.playing) { stop(); return; }
  const run = ++state.run; state.playing = true; $('play').textContent = 'Stop'; $('play').setAttribute('aria-pressed', 'true');
  while (state.run === run && state.i < CH.length) {
    state.seen.add(state.i); drawPanel();
    await speakOne(state.segs[state.i], CH[state.i].say, run);
    if (state.run !== run) return;
    if (state.i === CH.length - 1) break;
    await new Promise((r) => setTimeout(r, 500)); if (state.run !== run) return;
    state.i++;
  }
  if (state.run === run) stop();
}
const go = (k) => { stop(); state.i = Math.max(0, Math.min(CH.length - 1, k)); drawPanel(); };

// ---------- Answers ----------
async function answer(id, k) {
  const rec = { choice: k, label: ASKS.find((a) => a.id === id).opts[k], at: new Date().toISOString() };
  state.answers[id] = rec; drawPanel(); const st = $('st-' + id); if (st) st.textContent = 'Saving…';
  try {
    if (state.db) await state.db.doc('answers/' + id).set({ ...rec, by: state.me || null });
    try { localStorage.setItem('dd-answers', JSON.stringify(state.answers)); } catch {}
    if ($('st-' + id)) $('st-' + id).textContent = state.db ? 'Saved with this page' : 'Saved in this browser only';
  } catch (e) { if ($('st-' + id)) $('st-' + id).textContent = 'Not saved: ' + (e?.message || 'the store refused it'); }
}

// ---------- Start ----------
async function main() {
  try { state.answers = JSON.parse(localStorage.getItem('dd-answers') || '{}'); } catch {}
  const p = plan(); state.segs = p.segs;
  drawPanel(); $('voice').textContent = 'Voice: ' + voiceName();
  try {
    const { mount } = await import('./presenters/presenters.js');
    state.show = await mount($('stage'), { presenters: [WHO], duration: p.duration, cues: p.cues, tracks: { v: { mouthCues: p.mouth } },
      camera: [{ t: 0, focus: WHO, dist: 3.4, h: 0.85, lh: 0.78, fov: 30 }], tags: false, background: '#071624' });
    state.show.seek(state.segs[state.i].start);
    new ResizeObserver(() => { state.show.resize(); state.show.renderAt(state.show.t); }).observe($('stage'));
  } catch (e) { $('stage').innerHTML = '<p class="nostage">Tejo could not be drawn on this device. The briefing works without him: the captions and panels play the same.</p>'; }
  if (window.claude?.use) {
    claude.use('tts').then((t) => { if (t) { state.tts = t; $('voice').textContent = 'Voice: ' + voiceName(); } }).catch(() => {});
    claude.use('user').then(async (u) => { if (u) state.me = await u.id().catch(() => null); }).catch(() => {});
    claude.use('db').then((db) => { if (!db) return; state.db = db;
      db.collection('answers').onSnapshot((snap) => { for (const d of snap.docs) state.answers[d.id] = d.data(); if (CH[state.i].id === 'asks') drawPanel(); }, () => {}); }).catch(() => {});
  }
}
$('play').onclick = play; $('prev').onclick = () => go(state.i - 1); $('next').onclick = () => go(state.i + 1);
$('strip').onclick = (e) => { const b = e.target.closest('.chap'); if (b) go(+b.dataset.k); };
addEventListener('resize', () => { if (CH[state.i].net) drawNet(); });
main().catch((e) => { $('cap').textContent = 'The briefing could not start: ' + e.message; });
