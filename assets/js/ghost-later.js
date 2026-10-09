/* Ghost's sign-up pop-up (Portal) and its search are two scripts of about 750 KB. Ghost puts them in every page and they run
   before the page is settled, which slows the first paint on a phone. This file stands in for both: Ghost's configuration
   points the two addresses (portal__url and sodoSearch__url) here, and the real scripts are fetched only when they are
   wanted: at the first touch, key press or scroll, or at once when the address asks for them (#/portal/..., #/search, or
   the ?action= links in a sign-in email). Nothing about what they do changes; they just arrive a moment later.

   Needs: Ghost's own tag stays in the page (it carries the site's settings as data-* attributes); the real script reads them
   from it. The two addresses below are the ones Ghost uses by default (version ~2.71 and ~1.8 when this was written): check
   them against a page's source after a Ghost upgrade. This file is cached for a year, so a change goes in a new file name.
   To undo: remove portal__url and sodoSearch__url from Ghost's configuration and restart Ghost. */
(function () {
  var tag = document.currentScript;
  if (!tag) return;
  var search = tag.hasAttribute('data-sodo-search');
  var real = search ? 'https://cdn.jsdelivr.net/ghost/sodo-search@~1.8/umd/sodo-search.min.js' : 'https://cdn.jsdelivr.net/ghost/portal@~2.71/umd/portal.min.js';
  var started = false, events = ['pointerdown', 'touchstart', 'keydown', 'scroll', 'wheel'];

  function load() {
    if (started) return;
    started = true;
    events.forEach(function (e) { window.removeEventListener(e, load, true); });
    var s = document.createElement('script');
    s.src = real;
    s.crossOrigin = 'anonymous';
    [].forEach.call(tag.attributes, function (a) { if (a.name.indexOf('data-') === 0) s.setAttribute(a.name, a.value); });
    document.head.appendChild(s);
  }

  /* The address already asks for the pop-up (a link to #/portal/..., or the link in a sign-in email) */
  var wanted = search ? /^#\/search/.test(location.hash) : /^#\/portal/.test(location.hash) || /[?&]action=/.test(location.search);
  if (wanted) { load(); return; }
  events.forEach(function (e) { window.addEventListener(e, load, { capture: true, passive: true, once: true }); });
})();
