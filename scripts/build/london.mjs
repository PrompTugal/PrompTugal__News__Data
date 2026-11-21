// /london/: London, live (Dinis, 21 Nov 2026 ~09:16 UTC: "I really like the live in browser view, where we the data we collect
// also as archive"). Each panel is built from our own once-a-day read (the archive, shown if a source does not answer), and
// src/assets/london/live.js replaces it with the source's live figures, read in the visitor's browser when the page opens.
// data.b@PrompTugal.dinis.
import { raw, h, p } from './render.mjs';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const at = t => t ? esc(String(t).replace('T', ' ').replace(/(:\d\d)(\.\d+)?Z$/, '$1').slice(0, 16)) + ' UTC' : 'not read yet';
const sev = s => s === 10 ? 'good' : s >= 9 ? 'minor' : s >= 6 ? 'severe' : 'closed';

function statusRows(L) {
  return (L.lines || []).map(l => { const s = (l.statuses || [])[0] || {};
    return `<tr><th scope="row">${esc(l.name)}</th><td>${esc(l.mode)}</td><td><span class="ls ls-${sev(s.severity)}">${esc((l.statuses || []).map(x => x.status).join(', '))}</span></td><td>${esc(s.reason || '')}</td></tr>`; }).join('');
}
function panel(id, title, credit, src, inner, read) {
  return raw(`<section class="ldn" data-live="${id}" aria-labelledby="h-${id}">
<h2 id="h-${id}">${esc(title)}</h2>
<p class="ldn-when" data-when>From our read at ${at(read)} (the archive). Live figures load from the source when this page opens.</p>
<div data-body>${inner}</div>
<p class="ldn-credit">${esc(credit)} · <a href="/sources/${id}/">The source page</a> · <a href="/api/v1/${id}/latest.json">Our archive file</a>${src ? ` · <a href="${esc(src)}">The source's live address</a>` : ''}</p>
</section>`, `## ${title}\n\nFrom our read at ${at(read)}. ${credit}. Source page: /sources/${id}/`);
}

export function londonBlocks(sources) {
  const L = id => (sources.find(s => s.id === id) || {}).latest || {};
  const st = L('tfl-status'), bk = L('tfl-bikepoint'), rd = L('tfl-road-disruptions'), ci = L('carbon-intensity-london'), td = L('ea-thames-tide');
  const bc = bk.counts || {}, rc = rd.counts || {};
  const roads = (rd.disruptions || []).filter(d => d.severity && !/^(Minimal|No impact)$/.test(d.severity)).slice(0, 12);
  const mix = Object.entries((ci.now || {}).mix || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const fc = (ci.forecast || []).slice(0, 96);
  const max = Math.max(1, ...fc.map(f => f.forecast_gco2_kwh || 0));
  const spark = fc.length ? `<svg class="ldn-spark" viewBox="0 0 ${fc.length * 4} 60" role="img" aria-label="Forecast carbon intensity over the next ${fc.length / 2} hours"><polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${fc.map((f, i) => `${i * 4},${(60 - (f.forecast_gco2_kwh || 0) / max * 56).toFixed(1)}`).join(' ')}"/></svg>` : '';
  return [
    p('Live figures for London from Transport for London, the National Energy System Operator and the Environment Agency. When this page opens, your browser asks each of them directly for the latest figures (so they see your browser\'s request, as with any website); if one does not answer, the panel keeps our own copy, read once a day and kept as the archive. Not a warning service: for floods follow the [Environment Agency](https://check-for-flooding.service.gov.uk/) and for travel [TfL](https://tfl.gov.uk/).'),
    panel('tfl-status', 'Tube and rail line status', 'Powered by TfL Open Data', 'https://api.tfl.gov.uk/Line/Mode/tube,overground,elizabeth-line,dlr,tram/Status', `<div class="scroll"><table class="ldn-lines"><thead><tr><th scope="col">Line</th><th scope="col">Mode</th><th scope="col">Status</th><th scope="col">TfL's reason</th></tr></thead><tbody>${statusRows(st)}</tbody></table></div>`, st.read_at),
    panel('tfl-bikepoint', 'Santander Cycles', 'Powered by TfL Open Data', 'https://api.tfl.gov.uk/BikePoint', `<ul class="ldn-figs"><li><b>${esc(bc.bikes)}</b> bikes docked</li><li><b>${esc(bc.ebikes)}</b> of them e-bikes</li><li><b>${esc(bc.empty_docks)}</b> empty docks</li><li><b>${esc(bc.in_service)}</b> of ${esc(bc.docks_listed)} docks in service</li></ul>`, bk.read_at),
    panel('tfl-road-disruptions', 'Road disruptions', 'Powered by TfL Open Data', 'https://api.tfl.gov.uk/Road/all/Disruption', `<p><b>${esc(rc.disruptions)}</b> listed: ${Object.entries(rc.by_severity || {}).map(([k, v]) => `${esc(v)} ${esc(k.toLowerCase())}`).join(', ')}.</p><ul class="ldn-roads">${roads.map(d => `<li><span class="ls ls-minor">${esc(d.severity)}</span> ${esc(d.location)}: ${esc(d.description)}</li>`).join('')}</ul>`, rd.read_at),
    panel('carbon-intensity-london', 'Carbon intensity of London\'s electricity', 'Carbon Intensity API, National Energy System Operator (NESO), CC BY 4.0', 'https://api.carbonintensity.org.uk/regional/regionid/13', `<p class="ldn-big"><b>${esc((ci.now || {}).forecast_gco2_kwh)}</b> gCO<sub>2</sub>/kWh, <span class="ci ci-${esc(String((ci.now || {}).index || '').replace(/\s+/g, '-'))}">${esc((ci.now || {}).index)}</span> (${esc((ci.now || {}).from)} to ${esc((ci.now || {}).to)})</p><p>Generation mix: ${mix.map(([k, v]) => `${esc(k)} ${esc(v)}%`).join(', ')}.</p>${spark ? `<p>The forecast from our read, next ${fc.length / 2} hours:</p>${spark}` : ''}`, ci.read_at),
    panel('ea-thames-tide', 'The tidal Thames', 'This uses Environment Agency flood and river level data from the real-time data API (Beta)', 'https://environment.data.gov.uk/flood-monitoring/id/stations/0006/readings?_sorted&_limit=8', `<div class="scroll"><table class="ldn-tide"><thead><tr><th scope="col">Gauge (upstream to downstream)</th><th scope="col">Latest level (m)</th><th scope="col">At</th><th scope="col">24 h high</th><th scope="col">24 h low</th></tr></thead><tbody>${(td.gauges || []).map(g => `<tr data-gauge="${esc(g.id)}"><th scope="row">${esc(g.name)}</th><td data-v>${g.latest ? esc(g.latest.m) : 'no reading'}</td><td data-t>${g.latest ? at(g.latest.at) : ''}</td><td>${g.high_24h ? esc(g.high_24h.m) : ''}</td><td>${g.low_24h ? esc(g.low_24h.m) : ''}</td></tr>`).join('')}</tbody></table></div>`, td.read_at),
    h('The archive'),
    p('Each source is read once a day and every read is kept in git, so the past can be shown beside the live figures. The sources, their terms and their files: [line status](/sources/tfl-status/), [cycle hire](/sources/tfl-bikepoint/), [road disruptions](/sources/tfl-road-disruptions/), [carbon intensity](/sources/carbon-intensity-london/), [the tidal Thames](/sources/ea-thames-tide/), and London\'s other sources: [traffic cameras](/sources/tfl-jamcams/), [flood warnings](/sources/ea-flood/), [the forecast](/sources/open-meteo-london/) and [public contracts](/sources/contracts-finder/).'),
  ];
}
