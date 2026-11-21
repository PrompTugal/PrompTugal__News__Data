/* ptdata.js: load data.promptugal.news files in the browser and keep them there (Dinis, 21 Nov 2026: "Loading data directly from
   the browser (and keeping it on the browser local storage for a bit) is also a really good idea"). data.b@PrompTugal.dinis.

   PTData.load(url, { maxAgeMinutes, onUpdate }) returns a promise of the JSON.
   - If this browser holds a copy younger than maxAgeMinutes (default 60), it is returned at once and nothing is fetched.
   - If it holds an older copy, that copy is returned at once and a fresh one is fetched in the background; onUpdate(json) is
     called if the fresh copy differs (stale-while-revalidate). Offline, the kept copy is used.
   - With no copy, it fetches, keeps and returns.
   Copies live in the browser's Cache Storage ("pt-data-v1"), which holds files of several MB (the cyber file is about 4.7 MB),
   where localStorage cannot. Only same-site files are kept. Nothing is sent anywhere. PTData.clear() empties it.
   Code Apache-2.0. */
(function (root) {
  'use strict';
  var CACHE = 'pt-data-v1', HEADER = 'x-pt-kept-at';
  function sameSite(url) { try { return new URL(url, location.href).origin === location.origin; } catch (e) { return false; } }
  function fetchJson(url) { return fetch(url, { credentials: 'omit', headers: { accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url); return r.text(); }); }
  function store(cache, url, text) {
    var h = new Headers({ 'content-type': 'application/json' }); h.set(HEADER, String(Date.now()));
    return cache.put(url, new Response(text, { headers: h })).catch(function () { /* quota or blocked: still works without a copy */ });
  }
  function load(url, opts) {
    opts = opts || {};
    var maxAge = (opts.maxAgeMinutes == null ? 60 : opts.maxAgeMinutes) * 60000;
    if (!sameSite(url) || typeof caches === 'undefined') return fetchJson(url).then(JSON.parse);
    return caches.open(CACHE).then(function (cache) {
      return cache.match(url).then(function (hit) {
        if (!hit) return fetchJson(url).then(function (t) { return store(cache, url, t).then(function () { return JSON.parse(t); }); });
        var at = +hit.headers.get(HEADER) || 0;
        return hit.text().then(function (old) {
          if (Date.now() - at > maxAge) fetchJson(url).then(function (t) { store(cache, url, t); if (t !== old && typeof opts.onUpdate === 'function') opts.onUpdate(JSON.parse(t)); }, function () { /* offline: keep the copy */ });
          var j = JSON.parse(old); try { Object.defineProperty(j, '__keptAt', { value: at, enumerable: false }); } catch (e) {} return j;
        });
      });
    }, function () { return fetchJson(url).then(JSON.parse); });
  }
  function keptAt(json) { return json && json.__keptAt ? new Date(json.__keptAt) : null; }
  function clear() { return typeof caches === 'undefined' ? Promise.resolve(false) : caches.delete(CACHE); }
  root.PTData = { load: load, keptAt: keptAt, clear: clear, version: '1.0.0' };
})(window);
