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
  const statuses = list.map(c => ({ id: c.id, about: 'Changes of state only (up, down, page up without a player), from the operator\'s page; no frame or stream is fetched.', history: (c.history || []).map(h => ({ at: h.at, state: h.state === 'down' ? 'down' : h.state === 'up' ? 'up' : 'unknown', detail: h.state, http_status: h.http })) }));
  for (const st of statuses) writeJson(`api/v1/cameras/${st.id}/status.json`, st);
  const byPlace = {}; for (const c of cameras) (byPlace[c.place] ||= []).push(c.id);
  const index = {
    about: 'Public live cameras in the places we cover, from public bodies and operators\' own pages only: metadata and status, never a frame, snapshot or stream. Watch each on its operator\'s page. Embedding is "allowed" only where the operator\'s terms say so and the embed is on its own host; otherwise link out. Same data as /api/v1/cams/latest.json.',
    read_at: L ? L.read_at : null, counts: { cameras: cameras.length, places: Object.keys(byPlace).length }, by_place: byPlace, cameras,
    not_listed: (L && L.not_listed) || [], gaps: (L && L.gaps) || [], source: 'https://data.promptugal.news/api/v1/cams/latest.json', openapi: 'https://data.promptugal.news/api/v1/openapi.json',
  };
  writeJson('api/v1/cameras/index.json', index);
  return { index, statuses };
}
