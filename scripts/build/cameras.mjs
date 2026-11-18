// /api/v1/cameras/: the public cameras in the shape live.promptugal.news reads (live.b@PrompTugal.dinis asked, 18 Nov 2026
// 18:52 UTC). The same data as /api/v1/cams/latest.json (sources/cams/collect.mjs), reshaped; no other read. data.b@PrompTugal.dinis.
import { writeJson } from './lib.mjs';

const KIND = { municipality: 'camara', 'national infrastructure': 'ip', port: 'port', airport: 'airport', park: 'park' };
const host = u => { try { return new URL(u).hostname } catch { return null } };

export function buildCameras(sources) {
  const s = sources.find(x => x.id === 'cams'), L = s && s.latest;
  const list = (L && Array.isArray(L.cameras)) ? L.cameras : [];
  const cameras = list.map(c => {
    const embedHost = host(c.embed), pageHost = host(c.page);
    const allowed = !!(c.embed && embedHost && pageHost && embedHost.replace(/^www\./, '') === pageHost.replace(/^www\./, '') && c.embed_allowed === true);
    return {
      id: c.id, name: c.name, place: c.place, lat: c.lat, lon: c.lon, coords_source: c.coords_from || null,
      operator: { name: c.operator, kind: KIND[c.operator_kind] || 'operator', kind_detail: c.operator_kind, url: c.page ? new URL(c.page).origin + '/' : null },
      page_url: c.page,
      embed: { allowed: c.embed ? (allowed ? true : 'unclear') : false, url: c.embed || null, host: embedHost, how: allowed ? 'iframe' : 'link' },
      terms: { url: c.terms_page || null, summary: c.terms_summary || null, checked_at: (L.provenance && L.provenance.read_at || '').slice(0, 10) || null, embedding: allowed ? 'allowed' : 'unclear' },
      license: c.license || { name: "the source's terms", url: c.page },
      status: { state: c.state === 'down' ? 'down' : c.state === 'up' ? 'up' : 'unknown', detail: c.state, checked_at: c.checked_at, http_status: c.http, since: c.since },
      status_history: `https://data.promptugal.news/api/v1/cameras/${c.id}/status.json`,
      provenance: c.provenance || null,
      registered_at: c.history && c.history[0] ? c.history[0].at : c.checked_at, by: 'data.b@PrompTugal.dinis (register/cams.json, researched by data.b.collector@)',
    };
  });
  // TfL's JamCams (sources/tfl-jamcams): link only until TfL's transport data terms are read; status in the index only (about 900
  // cameras, no status file each, as live.b@ asked); the media host is shared by every AWS customer, so the path prefix is given too.
  const J = (sources.find(x => x.id === 'tfl-jamcams') || {}).latest;
  const TERMS_TFL = 'https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service';
  for (const c of (J && Array.isArray(J.cameras) ? J.cameras : [])) cameras.push({
    id: `london-tfl-${c.id.replace(/^JamCams_/, '').replace('.', '-')}`, source_id: c.id, name: c.name, place: 'london', country: 'GB', lat: c.lat, lon: c.lon, coords_source: 'operator (TfL Unified API)',
    view: c.view, operator: { name: 'Transport for London (TfL)', kind: 'ip', kind_detail: 'transport authority', url: 'https://tfl.gov.uk/' },
    page_url: 'https://tfl.gov.uk/traffic/status/',
    embed: { allowed: !!(c.video_url || c.image_url), url: c.video_url || c.image_url, image_url: c.image_url, video_url: c.video_url, host: J.media && J.media.host, path_prefix: J.media && J.media.path_prefix, how: c.video_url ? 'video' : 'image', note: 'TfL\'s Transport Data Service terms allow copying, publishing and commercial use with the credits below (terms read by Dinis Cruz in a browser, 18 Nov 2026). Load from TfL\'s own address; never stored.' },
    terms: { url: TERMS_TFL, summary: 'Open Government Licence v2.0 with TfL amendments: copy, publish, distribute, adapt and exploit commercially and non-commercially; credit "Powered by TfL Open Data" and the Ordnance Survey and Geomni statements; at most 500 calls a minute per feed; no suggestion of TfL endorsement.', checked_at: '2026-11-18', checked_by: 'Dinis Cruz, in a browser (tfl.gov.uk answers agents with a bot check)', embedding: 'allowed', commercial_use: 'allowed' },
    license: { name: "TfL's transport data terms (Powered by TfL Open Data)", url: TERMS_TFL, holder: 'Transport for London' }, credit: 'Powered by TfL Open Data. Contains OS data © Crown copyright and database rights 2016 and Geomni UK Map data © and database rights [2019]',
    status: { state: c.available ? 'up' : 'down', detail: c.available ? 'available (TfL)' : 'not available (TfL)', checked_at: J.read_at, http_status: null, since: c.modified },
    status_history: null,
    provenance: { listed_from: 'https://api.tfl.gov.uk/Place/Type/JamCam', listed_by: 'sources/tfl-jamcams/collect.mjs (code, no model)', listed_at: J.read_at, status_how: "TfL's own 'available' flag in the API answer; no image or clip fetched", licence: TERMS_TFL },
    registered_at: J.read_at, by: 'data.b@PrompTugal.dinis (sources/tfl-jamcams)' });
  const statuses = list.map(c => ({ id: c.id, about: 'Changes of state only (up, down, page up without a player), from the operator\'s page; no frame or stream is fetched.', history: (c.history || []).map(h => ({ at: h.at, state: h.state === 'down' ? 'down' : h.state === 'up' ? 'up' : 'unknown', detail: h.state, http_status: h.http })) }));
  for (const st of statuses) writeJson(`api/v1/cameras/${st.id}/status.json`, st);
  const byPlace = {}; for (const c of cameras) (byPlace[c.place] ||= []).push(c.id);
  const index = {
    about: 'Public live cameras in the places we cover, from public bodies and operators\' own pages only: metadata and status, never a frame, snapshot or stream. Watch each on its operator\'s page. Embedding is "allowed" only where the operator\'s terms say so and the embed is on its own host; otherwise link out. Same data as /api/v1/cams/latest.json and /api/v1/tfl-jamcams/latest.json.',
    read_at: L ? L.read_at : null, counts: { cameras: cameras.length, places: Object.keys(byPlace).length, embeddable: cameras.filter(c => c.embed && c.embed.allowed === true).length }, by_place: byPlace, cameras,
    not_listed: (L && L.not_listed) || [], gaps: (L && L.gaps) || [], source: 'https://data.promptugal.news/api/v1/cams/latest.json', openapi: 'https://data.promptugal.news/api/v1/openapi.json',
  };
  writeJson('api/v1/cameras/index.json', index);
  return { index, statuses };
}
