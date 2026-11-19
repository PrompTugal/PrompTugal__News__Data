// Starts the shared map (ptmap) from its data attribute; no inline script, no network. data.b@PrompTugal.dinis.
(function () {
  var el = document.getElementById('ptmap');
  if (!el || !window.PTMap || typeof window.PTMap.render !== 'function') return;
  var o; try { o = JSON.parse(el.getAttribute('data-ptmap') || '{}') } catch (e) { return }
  window.PTMap.render(el, o);
})();
