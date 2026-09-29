(function () {
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  var maxTilt = parseFloat(document.body.getAttribute('data-tilt') || '0');
  if (window.matchMedia('(max-width: 900px), (pointer: coarse) and (max-width: 1100px)').matches) maxTilt = Math.min(maxTilt, 2);

  // Filing codes, colours and tilt. Everything is derived from the post's slug,
  // so a post keeps the same code, colour and angle on every visit.
  function decorate(root) {
    root.querySelectorAll('.code[data-date]').forEach(function (el) {
      // Notes carry their own prefix (#QT, #RD…) and time, already written by the template
      if (el.hasAttribute('data-prefix')) return;
      var slug = (el.getAttribute('data-tag') || '').replace(/[^a-z0-9-]/gi, '');
      var parts = slug.split('-').filter(Boolean);
      var letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || 'xx').slice(0, 2);
      el.textContent = '#' + letters.toUpperCase() + el.getAttribute('data-date');
    });
    root.querySelectorAll('.tag-code[data-tag]').forEach(function (el) {
      var parts = (el.getAttribute('data-tag') || '').split('-').filter(Boolean);
      var letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || 'xx').slice(0, 2);
      el.textContent = '#' + letters.toUpperCase();
    });
    // Inside a post: tags up to 2 degrees, images up to 1.5, text never.
    root.querySelectorAll('.post-panel[data-key]').forEach(function (panel) {
      if (maxTilt <= 0) return;
      var key = panel.getAttribute('data-key') || '';
      var tagMax = Math.min(maxTilt, 2), imgMax = Math.min(maxTilt * 0.6, 1.5);
      panel.querySelectorAll('.panel-tags li').forEach(function (li, i) {
        var t = (hash(key + ':tag:' + i + li.textContent) % 2001) / 1000 - 1;
        li.style.setProperty('--tilt', (t * tagMax).toFixed(2) + 'deg');
      });
      panel.querySelectorAll('.panel-image, .panel-content .kg-image-card, .panel-content .kg-gallery-image').forEach(function (fig, i) {
        var t = (hash(key + ':img:' + i) % 2001) / 1000 - 1;
        fig.style.setProperty('--tilt', (t * imgMax).toFixed(2) + 'deg');
      });
    });
    root.querySelectorAll('.card[data-key], .post-panel[data-key]').forEach(function (el) {
      var h = hash(el.getAttribute('data-key') || '');
      // A colour tag on the post (e.g. #mint) fixes the colour; otherwise it comes from the slug.
      var fixed = el.getAttribute('data-color');
      el.setAttribute('data-hue', fixed ? fixed : String(h % 10));
      if (el.classList.contains('card') && maxTilt > 0) {
        var t = ((h >>> 8) % 2001) / 1000 - 1; // -1 to +1
        // The opening card always leans visibly, never close to straight.
        if (el.closest('.hero-card')) t = (t < 0 ? -1 : 1) * Math.max(Math.abs(t), 0.7);
        el.style.setProperty('--tilt', (t * maxTilt).toFixed(2) + 'deg');
      }
    });
  }
  decorate(document);


  // Phones and tablets: scale the homepage title to fill the screen width.
  // One line if that stays large enough; otherwise two balanced lines, each filling the width.
  var stacked = window.matchMedia('(max-width: 900px), (pointer: coarse) and (max-width: 1100px)');
  var heroTitle = document.querySelector('.hero .statement-text');
  var titleText = heroTitle ? heroTitle.textContent.trim() : '';
  var TITLE_SCALE = 0.7; // title at 70% of the full-width fit
  function widthAt100(el) { el.style.fontSize = '100px'; return el.scrollWidth; }
  function fitTitle() {
    if (!heroTitle) return;
    heroTitle.textContent = titleText;
    heroTitle.style.fontSize = '';
    heroTitle.style.whiteSpace = '';
    if (!stacked.matches) return;
    var box = heroTitle.parentElement.clientWidth;
    heroTitle.style.whiteSpace = 'nowrap';
    var one = 100 * box / widthAt100(heroTitle) * 0.97;
    if (one >= 56) {
      heroTitle.style.fontSize = (Math.min(one, 110) * TITLE_SCALE).toFixed(1) + 'px';
      return;
    }
    // Two lines: break at the space nearest the middle, size so the longer line fills the width.
    var words = titleText.split(/\s+/);
    if (words.length < 2) { heroTitle.style.whiteSpace = ''; heroTitle.style.fontSize = ''; return; }
    var best = 1, bestDiff = Infinity;
    for (var i = 1; i < words.length; i++) {
      var d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
      if (d < bestDiff) { bestDiff = d; best = i; }
    }
    var a = document.createElement('span'), b = document.createElement('span');
    a.textContent = words.slice(0, best).join(' ');
    b.textContent = words.slice(best).join(' ');
    a.style.display = b.style.display = 'block';
    heroTitle.textContent = '';
    heroTitle.appendChild(a); heroTitle.appendChild(b);
    heroTitle.style.fontSize = '100px';
    var widest = Math.max(a.scrollWidth, b.scrollWidth);
    var two = 100 * box / widest * 0.97;
    if (two >= 36) {
      heroTitle.style.fontSize = (Math.min(two, 110) * TITLE_SCALE).toFixed(1) + 'px';
    } else {
      heroTitle.textContent = titleText;
      heroTitle.style.whiteSpace = '';
      heroTitle.style.fontSize = '';
    }
  }
  fitTitle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);
  window.addEventListener('resize', fitTitle);


  // Floating navigation: on phones and tablets it slides away while scrolling down
  // through a page and returns as soon as the reader scrolls up.
  var dock = document.querySelector('.dock');
  if (dock) {
    var pill = dock.querySelector('.dock-pill');
    var baseTilt = parseFloat(document.body.getAttribute('data-tilt') || '0');
    if (pill && baseTilt > 0) pill.style.setProperty('--dock-tilt', (-Math.min(baseTilt, 3) * 0.48).toFixed(2) + 'deg');
    function wobble() {
      if (!pill) return;
      pill.classList.remove('is-wobbling');
      void pill.offsetWidth; // restart the animation
      pill.classList.add('is-wobbling');
    }
    if (pill) pill.addEventListener('animationend', function () { pill.classList.remove('is-wobbling'); });
    function setHidden(hide) {
      if (dock.classList.contains('is-hidden') === hide) return;
      if (hide) closeMore(false);
      dock.classList.toggle('is-hidden', hide);
      wobble();
    }
    // Each menu item leans at its own fixed angle.
    if (baseTilt > 0) {
      var itemMax = Math.min(baseTilt, 2.5) * 0.8;
      dock.querySelectorAll('a').forEach(function (a) {
        var t = (hash('dock:' + a.textContent.trim()) % 2001) / 1000 - 1;
        // Rows in the Everything panel are plain text, so they can lean almost as much as the pill items.
        var max = a.closest('.dock-more') ? itemMax * 0.9 : itemMax;
        a.style.setProperty('--item-tilt', (t * max).toFixed(2) + 'deg');
      });
    }

    // "Everything" menu: the primary item linking to #everything opens the
    // secondary navigation above the pill.
    var more = dock.querySelector('.dock-more');
    var trigger = null;
    if (more) {
      dock.querySelectorAll('.dock-pill a').forEach(function (a) {
        if (/#everything$/i.test(a.getAttribute('href') || '')) trigger = a;
      });
    }
    var closeTimer = null;
    function closeMore(returnFocus) {
      if (!trigger || trigger.getAttribute('aria-expanded') !== 'true') return;
      trigger.setAttribute('aria-expanded', 'false');
      more.classList.remove('is-open', 'is-wobbling');
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () { if (trigger.getAttribute('aria-expanded') === 'false') more.hidden = true; }, 280);
      if (returnFocus) trigger.focus();
    }
    // Place the panel directly above the Everything button, kept inside the screen,
    // and make it grow from the button's centre.
    function placeMore() {
      var d = dock.getBoundingClientRect(), t = trigger.getBoundingClientRect();
      more.style.setProperty('--more-min', Math.round(t.width) + 'px');
      var w = more.offsetWidth, vw = document.documentElement.clientWidth, margin = 12;
      var left = t.left;
      if (left + w > vw - margin) left = vw - margin - w;
      if (left < margin) left = margin;
      more.style.setProperty('--more-left', Math.round(left - d.left) + 'px');
      more.style.setProperty('--more-origin', Math.round(t.left + t.width / 2 - left) + 'px');
    }
    function openMore(fromKeyboard) {
      clearTimeout(closeTimer);
      more.hidden = false;
      placeMore();
      trigger.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(function () { requestAnimationFrame(function () { more.classList.add('is-open'); }); });
      if (fromKeyboard) { var first = more.querySelector('a'); if (first) setTimeout(function () { first.focus(); }, 60); }
    }
    if (trigger) {
      document.body.classList.add('has-everything');
      var label = document.createElement('span');
      label.className = 'dock-trigger-label';
      while (trigger.firstChild) label.appendChild(trigger.firstChild);
      trigger.appendChild(label);
      trigger.setAttribute('aria-label', label.textContent.trim());
      var icon = document.createElement('span');
      icon.className = 'dock-icon';
      icon.setAttribute('aria-hidden', 'true');
      trigger.appendChild(icon);
      trigger.classList.add('dock-trigger');
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-controls', 'dock-more');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        if (trigger.getAttribute('aria-expanded') === 'true') closeMore(false);
        else openMore(e.detail === 0);
      });
      more.addEventListener('click', function (e) { if (e.target.closest('a')) closeMore(false); });
      document.addEventListener('click', function (e) { if (!dock.contains(e.target)) closeMore(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMore(true); });
      window.addEventListener('resize', function () { if (trigger.getAttribute('aria-expanded') === 'true') placeMore(); });
    }

    // Make the pill fit narrow screens: tighten spacing, then move items (next-to-last first,
    // so the last item such as Connect stays visible) into the Everything panel, and finally
    // shrink Everything to its + button. Everything is re-checked on resize or rotation.
    var pillList = dock.querySelector('.dock-pill ul');
    var moreList = more ? more.querySelector('ul') : null;
    var originalItems = pillList ? [].slice.call(pillList.children) : [];
    var divider = null;
    function overflowing() { return pillList.scrollWidth > pillList.clientWidth + 1; }
    function fitPill() {
      if (!pillList) return;
      // reset to the full menu
      originalItems.forEach(function (li) { li.classList.remove('is-moved'); pillList.appendChild(li); });
      if (divider) { divider.remove(); divider = null; }
      dock.classList.remove('is-compact', 'is-tight');
      if (!overflowing()) return;
      dock.classList.add('is-compact');
      if (!overflowing()) return;
      if (trigger && moreList) {
        var triggerItem = trigger.closest('li');
        var movable = originalItems.filter(function (li) { return li !== triggerItem; }).slice(0, -1).reverse();
        var moved = [];
        for (var i = 0; i < movable.length && overflowing(); i++) {
          movable[i].classList.add('is-moved');
          movable[i].remove();
          moved.unshift(movable[i]); // keep their original left-to-right order
        }
        moved.forEach(function (li, k) { moreList.insertBefore(li, moreList.children[k] || null); });
        if (moved.length && moreList.children.length > moved.length) {
          divider = document.createElement('li');
          divider.className = 'more-divider';
          divider.setAttribute('aria-hidden', 'true');
          moreList.insertBefore(divider, moreList.children[moved.length]);
        }
      }
      if (overflowing() && trigger) dock.classList.add('is-tight');
    }
    fitPill();
    // Only re-fit when the width really changes (rotation, window resize), not when a phone's
    // address bar slides in and out while scrolling.
    var fitWidth = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === fitWidth) return;
      fitWidth = window.innerWidth;
      closeMore(false);
      fitPill();
    });
    // Reveal the menu once it has been fitted with the real fonts (after 1.5s regardless).
    // First page of a visit: it has been showing only Everything; it shakes, then grows to its
    // fitted width while the other items slide in. The final layout is worked out and the
    // starting state restored in one go, so no in-between size is ever painted.
    var revealDock = function () {
      if (dock.classList.contains('is-fitted')) { fitPill(); return; }
      var intro = trigger && pillList && !document.documentElement.classList.contains('dock-seen');
      if (!intro) { fitPill(); dock.classList.add('is-fitted'); return; }
      var triggerLi = trigger.closest('li');
      var startW = pill.offsetWidth;            // Everything alone
      dock.classList.add('is-fitted');          // every item back in the pill...
      fitPill();                                // ...then fitted for this screen
      var endW = pill.offsetWidth;
      var arriving = [].filter.call(pillList.children, function (li) { return li !== triggerLi && !li.classList.contains('more-divider'); });
      try { sessionStorage.setItem('dungeon-dock-intro', '1'); } catch (e) {}
      if (!arriving.length || endW <= startW) return;
      // Back to the starting look before anything is painted
      pill.style.boxSizing = 'border-box';
      pill.style.width = startW + 'px';
      pillList.style.overflow = 'hidden';
      arriving.forEach(function (li) { li.style.opacity = '0'; li.style.translate = '-12px 0'; });
      requestAnimationFrame(function () {
        wobble();
        setTimeout(function () {
          pill.style.transition = 'width 520ms cubic-bezier(0.25, 1.25, 0.4, 1), rotate 220ms ease';
          pill.style.width = endW + 'px';
          arriving.forEach(function (li, i) {
            var delay = 140 + i * 90;
            li.style.transition = 'opacity 260ms ease ' + delay + 'ms, translate 360ms cubic-bezier(0.2, 0.9, 0.3, 1.25) ' + delay + 'ms';
            li.style.opacity = '1';
            li.style.translate = '0 0';
          });
          setTimeout(function () {
            ['boxSizing', 'width', 'transition'].forEach(function (p) { pill.style[p] = ''; });
            pillList.style.overflow = '';
            arriving.forEach(function (li) { li.style.transition = ''; li.style.opacity = ''; li.style.translate = ''; });
          }, 520 + 140 + arriving.length * 90 + 400);
        }, 380);
      });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(revealDock); else revealDock();
    setTimeout(function () { if (!dock.classList.contains('is-fitted')) revealDock(); }, 1500);

    var lastY = window.scrollY, ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        // Once the footer is on screen the menu is resting above the Index, so keep it visible.
        var footer = document.querySelector('.colophon');
        var parked = footer && footer.getBoundingClientRect().top < window.innerHeight;
        if (stacked.matches && y > lastY + 6 && y > 200 && !parked) setHidden(true);
        else if (y < lastY - 6 || y < 200 || parked) setHidden(false);
        lastY = y;
        ticking = false;
      });
    }, { passive: true });
  }


  // Touch devices: scroll-linked "hover". Each card's --focus is the share of it that's
  // on screen, reaching 1 once the card (or most of the screen, for tall cards) is in view.
  var noHover = window.matchMedia('(hover: none)');
  var focusCards = [].slice.call(document.querySelectorAll('.cards .card, .hero-card .card, .now-card, .scatter-card'));
  var focusQueued = false;
  function updateFocus() {
    focusQueued = false;
    if (!noHover.matches) return;
    var vh = window.innerHeight;
    focusCards.forEach(function (card) {
      if (!card.offsetParent) return; // hidden copy (e.g. desktop-only opening card)
      var r = card.getBoundingClientRect();
      var visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      var needed = Math.min(r.height, vh * 0.85);
      var f = visible <= 0 ? 0 : Math.min(1, visible / needed);
      card.style.setProperty('--focus', f.toFixed(3));
    });
  }
  function queueFocus() { if (!focusQueued) { focusQueued = true; requestAnimationFrame(updateFocus); } }
  if (focusCards.length) {
    window.addEventListener('scroll', queueFocus, { passive: true });
    window.addEventListener('resize', queueFocus);
    updateFocus();
  }

  // Now page: each month shows its opening and fades; clicking opens the full month
  // in the same overlay as posts (months have no page of their own).
  document.querySelectorAll('.now-body').forEach(function (body) {
    if (body.scrollHeight > body.clientHeight + 4) body.classList.add('is-clamped');
  });
  function openMonth(card) {
    var readerEl = document.querySelector('.reader');
    var bodyEl = readerEl && readerEl.querySelector('.reader-body');
    if (!readerEl || !bodyEl || typeof readerEl.showModal !== 'function') return;
    var panel = document.createElement('article');
    panel.className = 'post-panel';
    panel.setAttribute('data-key', card.getAttribute('data-key') || '');
    var head = document.createElement('header');
    head.className = 'panel-head';
    var h = document.createElement('h1');
    h.className = 'panel-title';
    h.textContent = card.getAttribute('data-month') || '';
    head.appendChild(h);
    var content = document.createElement('div');
    content.className = 'panel-content gh-content';
    content.innerHTML = card.querySelector('.now-body').innerHTML;
    panel.appendChild(head);
    panel.appendChild(content);
    bodyEl.replaceChildren(panel);
    decorate(bodyEl);
    liteYouTube(bodyEl);
    document.documentElement.classList.add('reader-open');
    readerEl.showModal();
    readerEl.scrollTop = 0;
  }
  // Now page arrows: move one card at a time; hidden when everything already fits.
  var nowRow = document.querySelector('.now-timeline');
  var nowControls = document.querySelector('.now-controls');
  if (nowRow && nowControls) {
    var steps = nowControls.querySelectorAll('.now-step');
    function updateSteps() {
      var max = nowRow.scrollWidth - nowRow.clientWidth;
      nowControls.hidden = max <= 4 || stacked.matches;
      steps[0].disabled = nowRow.scrollLeft <= 4;
      steps[1].disabled = nowRow.scrollLeft >= max - 4;
    }
    steps.forEach(function (b) {
      b.addEventListener('click', function () {
        var first = nowRow.querySelector('.now-month');
        var step = first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(nowRow).columnGap || 0) : nowRow.clientWidth;
        nowRow.scrollBy({ left: step * parseInt(b.getAttribute('data-dir'), 10), behavior: 'smooth' });
      });
    });
    nowRow.addEventListener('scroll', function () { requestAnimationFrame(updateSteps); }, { passive: true });
    window.addEventListener('resize', updateSteps);
    updateSteps();
  }

  document.querySelectorAll('.now-card').forEach(function (card) {
    card.addEventListener('click', function (e) { if (!e.target.closest('a, .yt-lite, iframe, .stamp')) openMonth(card); });
    card.addEventListener('keydown', function (e) {
      if (e.target !== card) return; // keys pressed inside the card (on the stamp, say) are not for the card
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMonth(card); }
    });
  });

  // Touch devices: scroll-linked "hover". Each card's --focus is the share of it that's
  // on screen, reaching 1 once the card (or most of the screen, for tall cards) is in view.
  var noHover = window.matchMedia('(hover: none)');
  var focusCards = [].slice.call(document.querySelectorAll('.cards .card, .hero-card .card, .now-card'));
  var focusQueued = false;
  function updateFocus() {
    focusQueued = false;
    if (!noHover.matches) return;
    var vh = window.innerHeight;
    focusCards.forEach(function (card) {
      if (!card.offsetParent) return; // hidden copy (e.g. desktop-only opening card)
      var r = card.getBoundingClientRect();
      var visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      var needed = Math.min(r.height, vh * 0.85);
      var f = visible <= 0 ? 0 : Math.min(1, visible / needed);
      card.style.setProperty('--focus', f.toFixed(3));
    });
  }
  function queueFocus() { if (!focusQueued) { focusQueued = true; requestAnimationFrame(updateFocus); } }
  if (focusCards.length) {
    window.addEventListener('scroll', queueFocus, { passive: true });
    window.addEventListener('resize', queueFocus);
    updateFocus();
  }

  // Now page: clamp long months, with a "Read the rest" toggle.
  document.querySelectorAll('.now-card').forEach(function (card) {
    var body = card.querySelector('.now-body'), more = card.querySelector('.now-more');
    if (!body || !more) return;
    if (body.scrollHeight > body.clientHeight + 4) {
      body.classList.add('is-clamped');
      more.hidden = false;
      more.addEventListener('click', function () {
        var open = card.classList.toggle('is-expanded');
        more.textContent = open ? 'Show less' : 'Read the rest';
      });
    }
  });

  // YouTube embeds: show a thumbnail and play button; load the real player only on tap,
  // from YouTube's privacy-enhanced domain, so pages don't load YouTube for every visitor.
  function liteYouTube(root) {
    root.querySelectorAll('iframe[src*="youtube.com/embed/"], iframe[src*="youtube-nocookie.com/embed/"]').forEach(function (frame) {
      var m = (frame.getAttribute('src') || '').match(/embed\/([A-Za-z0-9_-]{6,})/);
      if (!m) return;
      var id = m[1];
      var title = frame.getAttribute('title') || 'YouTube video';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'yt-lite';
      btn.setAttribute('aria-label', 'Play: ' + title);
      btn.style.backgroundImage = 'url("https://i.ytimg.com/vi/' + id + '/hqdefault.jpg")';
      btn.setAttribute('data-yt', id);
      frame.replaceWith(btn);
    });
  }
  liteYouTube(document);
  // One handler for every play button, including copies shown in the overlay.
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.yt-lite');
    if (!btn) return;
    var id = btn.getAttribute('data-yt');
    var f = document.createElement('iframe');
    f.className = 'yt-frame';
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
    f.title = (btn.getAttribute('aria-label') || 'YouTube video').replace(/^Play: /, '');
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    btn.replaceWith(f);
  });

  // Quote/lyric cards: a YouTube or YouTube Music link in the body becomes a play/stop button.
  // Playing opens a small visible player in the card (YouTube requires the player to be visible).
  var PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
  var STOP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
  function ytId(href) {
    var m = (href || '').match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : null;
  }
  document.querySelectorAll('.scatter-card--quote').forEach(function (card) {
    var body = card.querySelector('.scatter-body');
    var by = card.querySelector('.quote-by');
    if (!body || !by) return;
    var id = null, source = null;
    var lite = body.querySelector('.yt-lite');
    if (lite) { id = lite.getAttribute('data-yt'); source = lite.closest('figure') || lite; }
    if (!id) {
      var frame = body.querySelector('iframe[src*="youtube"]');
      if (frame) { id = ytId(frame.getAttribute('src')); source = frame.closest('figure') || frame; }
    }
    if (!id) {
      body.querySelectorAll('a[href]').forEach(function (a) {
        if (id || !/youtu(\.be|be\.com)/.test(a.href)) return;
        id = ytId(a.href);
        // A pasted link can arrive as a Ghost card (bookmark preview or embed): drop the whole card.
        var cardEl = a.closest('figure, .kg-card');
        var p = a.closest('p');
        if (cardEl && body.contains(cardEl)) source = cardEl;
        // A line holding nothing but the link goes entirely; otherwise keep the words, lose the link.
        else if (p && p.textContent.trim() === a.textContent.trim()) source = p;
        else a.replaceWith(document.createTextNode(a.textContent));
      });
    }
    if (!id) return;
    if (source) source.remove();
    var title = (card.querySelector('.quote-by-text') || by).textContent.trim();
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quote-play';
    btn.setAttribute('aria-label', 'Play ' + title);
    btn.innerHTML = PLAY_SVG;
    by.appendChild(btn);
    var player = null;
    btn.addEventListener('click', function () {
      if (player) {
        player.remove(); player = null;
        btn.classList.remove('is-playing');
        btn.innerHTML = PLAY_SVG;
        btn.setAttribute('aria-label', 'Play ' + title);
        return;
      }
      player = document.createElement('div');
      player.className = 'quote-player';
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      f.title = title;
      f.allow = 'autoplay; encrypted-media; picture-in-picture';
      player.appendChild(f);
      by.after(player);
      btn.classList.add('is-playing');
      btn.innerHTML = STOP_SVG;
      btn.setAttribute('aria-label', 'Stop ' + title);
    });
  });

  // Scatter Thoughts wall: pack cards under each other in columns (masonry) while keeping
  // newest-first order across the top. Without this script the page keeps the plain row layout.
  var wall = document.querySelector('.scatter');
  if (wall && 'ResizeObserver' in window) {
    var ROW = 4;
    var wallCards = [].slice.call(wall.querySelectorAll('.scatter-card'));
    function gapPx() { return stacked.matches ? 24 : 32; }
    function sizeCard(card) {
      // offsetHeight ignores the card's tilt, so rotation doesn't inflate the measurement
      var h = card.offsetHeight;
      card.style.gridRowEnd = 'span ' + Math.ceil((h + gapPx()) / ROW);
    }
    wall.classList.add('is-wall');
    var queued = false;
    var ro = new ResizeObserver(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; wallCards.forEach(sizeCard); });
    });
    wallCards.forEach(function (card) { sizeCard(card); ro.observe(card); });
  }

  // Scatter wall entrance: each note fades up into place as it scrolls into view, with a
  // random short delay so they arrive staggered rather than all at once or in strict order.
  var scatterWall = document.querySelector('.scatter');
  var calmMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (scatterWall && 'IntersectionObserver' in window && !calmMotion) {
    scatterWall.classList.add('is-staged');
    var inView = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.style.setProperty('--in-delay', Math.round(Math.random() * 450) + 'ms');
        en.target.classList.add('is-in');
        inView.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -5% 0px' });
    scatterWall.querySelectorAll('.scatter-card').forEach(function (card) { inView.observe(card); });
  }

  // Synthesised saber sound (original, generated in the browser; not a recording).
  // kind 'on' = ignition (rising sweep, static crackle, hum); 'off' = power-down (falling sweep).
  // Written against any AudioContext so it can also be rendered offline for testing.
  var SABER_VOLUME = 0.5; // master volume for the whole sound (1 = full)
  // Synthesised saber sound (original, generated in the browser; not a recording).
  // Ingredients: a buzzy hum with a slightly detuned twin (the throb), a thin electrical buzz on
  // top, a fast pitch swell with a whoosh on ignition, and sharp electrical crackle.
  // kind 'on' = ignition, 'off' = power-down. Works with any AudioContext (offline for tests).
  function saberSound(ctx, when, kind, blue) {
    var f = blue ? 94 : 84, on = kind === 'on', dur = on ? 1.7 : 0.6, sr = ctx.sampleRate;
    var master = ctx.createGain(); master.gain.value = SABER_VOLUME; master.connect(ctx.destination);
    var buffer = function (seconds, fill) {
      var n = Math.max(1, Math.floor(sr * seconds)), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
      fill(d, n); var s = ctx.createBufferSource(); s.buffer = b; return s;
    };
    // --- The hum: buzzy tone + slightly detuned twin + sub, driven for grit, through a resonant filter
    var hum = ctx.createGain(); hum.gain.value = 0;
    var drive = ctx.createWaveShaper(), curve = new Float32Array(2048);
    for (var c = 0; c < 2048; c++) { var x = c / 1024 - 1; curve[c] = Math.tanh(x * 3); }
    drive.curve = curve;
    var tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.Q.value = 4;
    drive.connect(tone); tone.connect(hum); hum.connect(master);
    var oscs = [['sawtooth', 1, 0.5], ['sawtooth', 1.009, 0.45], ['square', 0.5, 0.35], ['sawtooth', 2.003, 0.18]].map(function (s) {
      var o = ctx.createOscillator(), g = ctx.createGain(); o.type = s[0]; g.gain.value = s[2];
      o.connect(g); g.connect(drive); o._ratio = s[1]; return o;
    });
    // The thin electrical buzz on top of the hum
    var buzzOsc = ctx.createOscillator(), buzzHp = ctx.createBiquadFilter(), buzz = ctx.createGain();
    buzzOsc.type = 'sawtooth'; buzzHp.type = 'highpass'; buzzHp.frequency.value = 2800; buzz.gain.value = 0;
    buzzOsc.connect(buzzHp); buzzHp.connect(buzz); buzz.connect(master); oscs.push(buzzOsc); buzzOsc._ratio = 1;
    // A slow throb in the level
    var lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 2.3; lfoG.gain.value = 0.03;
    lfo.connect(lfoG); lfoG.connect(hum.gain);
    var setPitch = function (points) {
      oscs.forEach(function (o) {
        o.frequency.setValueAtTime(f * o._ratio * points[0][1], when);
        for (var i = 1; i < points.length; i++) o.frequency.exponentialRampToValueAtTime(f * o._ratio * points[i][1], when + points[i][0]);
      });
    };
    if (on) {
      // Ignition "vwoom": pitch shoots up, overshoots, settles; the filter opens with it
      setPitch([[0, 0.32], [0.16, 1.14], [0.34, 0.99], [0.5, 1]]);
      tone.frequency.setValueAtTime(250, when); tone.frequency.exponentialRampToValueAtTime(4200, when + 0.14);
      tone.frequency.exponentialRampToValueAtTime(1500, when + 0.45);
      hum.gain.setValueAtTime(0.0001, when); hum.gain.exponentialRampToValueAtTime(0.5, when + 0.1);
      hum.gain.exponentialRampToValueAtTime(0.3, when + 0.4); hum.gain.setValueAtTime(0.3, when + dur - 0.5);
      hum.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      buzz.gain.setValueAtTime(0.0001, when); buzz.gain.exponentialRampToValueAtTime(0.05, when + 0.2);
      buzz.gain.setValueAtTime(0.05, when + dur - 0.5); buzz.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      // Whoosh: air-like noise sweeping through a band as the blade shoots out
      var whoosh = buffer(0.5, function (d, n) { for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; });
      var wBp = ctx.createBiquadFilter(), wG = ctx.createGain(); wBp.type = 'bandpass'; wBp.Q.value = 1.2;
      wBp.frequency.setValueAtTime(700, when); wBp.frequency.exponentialRampToValueAtTime(5200, when + 0.13); wBp.frequency.exponentialRampToValueAtTime(1200, when + 0.45);
      wG.gain.setValueAtTime(0.0001, when); wG.gain.exponentialRampToValueAtTime(0.5, when + 0.06); wG.gain.exponentialRampToValueAtTime(0.0001, when + 0.48);
      whoosh.connect(wBp); wBp.connect(wG); wG.connect(master); whoosh.start(when);
    } else {
      // Power-down: pitch falls away as the hum dies
      setPitch([[0, 1], [0.12, 1.05], [dur, 0.3]]);
      tone.frequency.setValueAtTime(1500, when); tone.frequency.exponentialRampToValueAtTime(180, when + dur);
      hum.gain.setValueAtTime(0.3, when); hum.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      buzz.gain.setValueAtTime(0.04, when); buzz.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.6);
    }
    // Crackle: sharp individual electrical snaps, dense at first and thinning out, with the odd zap
    var crackLen = on ? 0.9 : 0.25;
    var crackle = buffer(crackLen, function (d, n) {
      var t = 0;
      while (t < crackLen) {
        var rate = on ? 110 * Math.exp(-t / 0.2) + 6 : 70 * Math.exp(-t / 0.08) + 4;
        t += -Math.log(1 - Math.random()) / rate;
        var i0 = Math.floor(t * sr); if (i0 >= n) break;
        var zap = Math.random() < 0.08, len = Math.floor(sr * (zap ? 0.006 + Math.random() * 0.01 : 0.0006 + Math.random() * 0.0025));
        var amp = (zap ? 0.5 : 0.6 + Math.random() * 0.4) * (Math.random() < 0.5 ? -1 : 1);
        for (var k = 0; k < len && i0 + k < n; k++) d[i0 + k] += amp * (zap ? (Math.random() * 2 - 1) : (k % 2 ? -1 : 1) * 0.7 + (Math.random() - 0.5) * 0.6) * Math.exp(-k / (len * 0.35));
      }
    });
    var cHp = ctx.createBiquadFilter(), cPk = ctx.createBiquadFilter(), cG = ctx.createGain();
    cHp.type = 'highpass'; cHp.frequency.value = 1100; cPk.type = 'peaking'; cPk.frequency.value = 3500; cPk.gain.value = 6; cG.gain.value = on ? 0.55 : 0.4;
    crackle.connect(cHp); cHp.connect(cPk); cPk.connect(cG); cG.connect(master); crackle.start(when);
    oscs.concat([lfo]).forEach(function (o) { o.start(when); o.stop(when + dur + 0.05); });
  }
  window.__saberSound = saberSound; // exposed for offline rendering in tests

  // Lightsaber switch: red blade in dark mode, blue in light. Click: the blade retracts, the
  // mode flips, a blade of the other colour ignites, and a short toast appears. The choice is
  // remembered in this browser (applied in <head> before first paint on later visits).
  var saber = document.querySelector('.saber');
  if (saber) {
    var rootEl = document.documentElement;
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    var calmSaber = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var toast = document.querySelector('.saber-toast');
    var effective = function () { var s = rootEl.getAttribute('data-scheme'); return s === 'light' || s === 'dark' ? s : (prefersDark.matches ? 'dark' : 'light'); };
    var paint = function () {
      var dark = effective() === 'dark';
      saber.classList.toggle('is-blue', !dark);
      saber.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    };
    paint();
    prefersDark.addEventListener('change', paint);
    // Electricity: jagged lines that crackle along the blade
    var sparks = [].slice.call(saber.querySelectorAll('.saber-sparks polyline'));
    var crackle = function () {
      if (saber.classList.contains('is-off')) { sparks.forEach(function (p) { p.style.opacity = 0; }); return; }
      sparks.forEach(function (p) {
        if (Math.random() < 0.45) { p.style.opacity = 0; return; }
        var x = 34 + Math.random() * 40, pts = [], len = 18 + Math.random() * 34, side = Math.random() < 0.5 ? -1 : 1;
        for (var k = 0; k <= 6; k++) pts.push((x + k * len / 6).toFixed(1) + ',' + (14 + side * (4 + Math.random() * 6) * (k % 2 ? 1 : 0.35)).toFixed(1));
        p.setAttribute('points', pts.join(' '));
        p.style.opacity = (0.5 + Math.random() * 0.5).toFixed(2);
      });
    };
    if (!calmSaber) setInterval(crackle, 110);
    var toastTimer, busySaber = false, saberAudio = null;
    saber.addEventListener('click', function () {
      if (busySaber) return;
      busySaber = true;
      var next = effective() === 'dark' ? 'light' : 'dark';
      var apply = function () {
        rootEl.setAttribute('data-scheme', next);
        try { localStorage.setItem('dungeon-scheme', next); } catch (e) {}
        paint();
      };
      // The mode change itself takes 2 seconds: a circle of the new mode grows out from the
      // saber until it covers the page; without View Transitions, colours blend across instead.
      var changeMode = function () {
        if (calmSaber) { apply(); return; }
        if (document.startViewTransition) {
          var r = saber.getBoundingClientRect(), cx = r.left + r.width * 0.6, cy = r.top + r.height / 2;
          var radius = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 100;
          var toDark = next === 'dark', colour = toDark ? '255, 50, 50' : '70, 170, 255';
          // Canvas for the static on the edge, on its own layer above the old and new views
          var dpr = Math.min(window.devicePixelRatio || 1, 2);
          var edge = document.createElement('canvas');
          edge.className = 'saber-edge';
          edge.width = Math.round(innerWidth * dpr); edge.height = Math.round(innerHeight * dpr);
          document.body.appendChild(edge);
          var g = edge.getContext('2d'); g.scale(dpr, dpr);
          rootEl.style.setProperty('--vt-x', cx + 'px'); rootEl.style.setProperty('--vt-y', cy + 'px'); rootEl.style.setProperty('--vt-r', '0px');
          var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
          var drawEdge = function (rad, fade) {
            g.clearRect(0, 0, innerWidth, innerHeight);
            if (rad <= 2) return;
            var arcs = 3;
            for (var a = 0; a < arcs; a++) {
              g.beginPath();
              var steps = Math.max(40, Math.round(rad / 6)), start = Math.random() * Math.PI * 2;
              for (var s = 0; s <= steps; s++) {
                var ang = start + s / steps * Math.PI * 2;
                var jr = rad - 40 + (Math.random() - 0.5) * (a === 0 ? 14 : 26);
                var px = cx + Math.cos(ang) * jr, py = cy + Math.sin(ang) * jr;
                if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
              }
              g.strokeStyle = 'rgba(' + colour + ',' + (fade * (a === 0 ? 0.9 : 0.45)).toFixed(2) + ')';
              g.lineWidth = a === 0 ? 1.6 : 0.9;
              g.shadowColor = 'rgba(' + colour + ',' + fade.toFixed(2) + ')';
              g.shadowBlur = 14;
              g.stroke();
            }
          };
          var vt = document.startViewTransition(apply);
          var D = 2000, stopped = false;
          var cleanUp = function () {
            stopped = true;
            edge.remove();
            ['--vt-x', '--vt-y', '--vt-r'].forEach(function (v) { rootEl.style.removeProperty(v); });
          };
          vt.ready.then(function () {
            // The browser keeps a transition alive only while something in it animates, so run a
            // 2-second hold on the new view; the circle and static are drawn frame by frame below.
            rootEl.animate({ opacity: [1, 1] }, { duration: D, pseudoElement: '::view-transition-new(root)' });
            var t0 = performance.now();
            (function frame(now) {
              if (stopped) return;
              var p = Math.min(1, (now - t0) / D), rad = ease(p) * radius;
              rootEl.style.setProperty('--vt-r', rad + 'px');
              drawEdge(rad, p < 0.85 ? 1 : (1 - p) / 0.15);
              if (p < 1) requestAnimationFrame(frame);
            })(t0);
          }).catch(function () {});
          vt.finished.then(cleanUp, cleanUp);
        } else {
          rootEl.classList.add('is-theming');
          apply();
          setTimeout(function () { rootEl.classList.remove('is-theming'); }, 2100);
        }
      };
      var flip = function () {
        changeMode();
        toast.textContent = next === 'light' ? saber.getAttribute('data-light-msg') : saber.getAttribute('data-dark-msg');
        toast.classList.add('is-on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2600);
      };
      // Sound: only the new blade's ignition, in time with it growing from the hilt
      if (saber.getAttribute('data-sound') !== 'off') {
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (AC) {
            saberAudio = saberAudio || new AC();
            if (saberAudio.state === 'suspended') saberAudio.resume();
            var now = saberAudio.currentTime, wasBlue = effective() === 'light';
            saberSound(saberAudio, now + 0.26, 'on', !wasBlue);
          }
        } catch (e) {}
      }
      if (calmSaber) { flip(); busySaber = false; return; }
      saber.classList.add('is-off');
      setTimeout(function () {
        flip();
        saber.classList.add('is-igniting');
        saber.classList.remove('is-off');
        setTimeout(function () { saber.classList.remove('is-igniting'); busySaber = false; }, 2050);
      }, 260);
    });
  }

  // Consistent menu position and screen-filling Now cards.
  // 1. On the Now page (wider screens), each card's preview grows to fill the space between the
  //    top of the cards and the menu's usual spot, so bigger screens show more of each month.
  // 2. On every page, the main content is at least as tall as the screen, so the floating menu
  //    starts pinned at the bottom of the screen and the footer always begins below the fold.
  var mainEl = document.getElementById('main');
  var nowRowFit = document.querySelector('.now-timeline');
  function px(el, prop) { return parseFloat(getComputedStyle(el)[prop]) || 0; }
  function fitNowCards() {
    if (!nowRowFit) return;
    nowRowFit.style.removeProperty('--now-body-max');
    if (stacked.matches) return;
    var card = nowRowFit.querySelector('.now-card');
    var body = card && card.querySelector('.now-body');
    if (!body) return;
    var label = nowRowFit.querySelector('.month-label');
    var dockBox = document.querySelector('.dock');
    var top = nowRowFit.getBoundingClientRect().top + window.scrollY;
    var labelSpace = label ? label.offsetHeight + px(label, 'marginTop') : 0;
    var dockSpace = dockBox ? dockBox.offsetHeight + 16 + 24 : 0; // pill + its bottom offset + a little air
    var cardChrome = px(card, 'paddingTop') + px(card, 'paddingBottom') + (body.getBoundingClientRect().top - card.getBoundingClientRect().top - px(card, 'paddingTop'));
    var available = window.innerHeight - top - px(nowRowFit, 'paddingTop') - px(nowRowFit, 'paddingBottom') - labelSpace - dockSpace - cardChrome;
    var line = px(body, 'lineHeight') || 24;
    var minH = line * 6, maxH = line * 40;
    nowRowFit.style.setProperty('--now-body-max', Math.round(Math.max(minH, Math.min(maxH, available))) + 'px');
    nowRowFit.querySelectorAll('.now-body').forEach(function (b) {
      b.classList.toggle('is-clamped', b.scrollHeight > b.clientHeight + 4);
    });
    nowRowFit.querySelectorAll('.now-card').forEach(drawFlora);
  }

  // Etched botanical sprigs in the empty space below a Now card's text. Random but stable:
  // each card's pattern is seeded from its URL, so a month always draws the same sprigs.
  function drawFlora(card) {
    var old = card.querySelector('.now-flora');
    if (old) old.remove();
    if (stacked.matches) return;
    var body = card.querySelector('.now-body');
    if (!body) return;
    // Measure in the card's own (un-tilted) frame: on-screen boxes of tilted cards are inflated
    var padL = px(card, 'paddingLeft'), padR = px(card, 'paddingRight'), padB = px(card, 'paddingBottom');
    var textBottom = 0;
    [].forEach.call(card.children, function (el) { if (el.classList.contains('now-flora')) return; textBottom = Math.max(textBottom, el.offsetTop + el.offsetHeight); });
    var W = Math.round(card.clientWidth - padL - padR), H = Math.round(card.clientHeight - textBottom - padB - 16);
    // The pattern's structure comes only from the seed; the size just scales positions,
    // so a 1px difference between loads can't add or remove anything.
    if (W < 80 || H < 70) return;
    // Which pattern: a month's #filler-… tag wins, otherwise the theme setting
    var SETTING = { 'floral': 'floral', 'circuit board': 'circuit', 'cityscape': 'city', 'topographic': 'topo', 'none': 'none' };
    var timeline = card.closest('.now-timeline');
    var kind = card.getAttribute('data-filler') || SETTING[((timeline && timeline.getAttribute('data-filler')) || 'floral').toLowerCase()] || 'floral';
    if (kind === 'none') return;
    var seed = 0, key = card.getAttribute('data-key') || card.getAttribute('data-month') || 'now';
    for (var i = 0; i < key.length; i++) seed = Math.imul(seed ^ key.charCodeAt(i), 2654435761) >>> 0;
    var rnd = function () { seed = (seed + 0x6D2B79F5) >>> 0; var t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    var parts = [];
    var f1 = function (n) { return n.toFixed(1); };
    function leaf(x, y, ang, len) {
      var w = len * 0.32;
      parts.push('<g transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(ang) + ')"><path d="M0 0Q' + f1(len / 2) + ' ' + f1(-w) + ' ' + f1(len) + ' 0Q' + f1(len / 2) + ' ' + f1(w) + ' 0 0Z"/><path d="M' + f1(len * 0.12) + ' 0L' + f1(len * 0.82) + ' 0"/></g>');
    }
    function flower(x, y, r) {
      var n = 5 + Math.floor(rnd() * 3), rot = rnd() * 360;
      for (var k = 0; k < n; k++) parts.push('<ellipse cx="' + f1(x) + '" cy="' + f1(y - r) + '" rx="' + f1(r * 0.42) + '" ry="' + f1(r) + '" transform="rotate(' + f1(rot + k * 360 / n) + ' ' + f1(x) + ' ' + f1(y) + ')"/>');
      parts.push('<circle class="seed" cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r * 0.28) + '"/>');
    }
    function bud(x, y, ang) {
      parts.push('<g transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(ang) + ')"><path d="M0 0Q-4 -5 0 -11Q4 -5 0 0Z"/></g>');
    }
    function drawFloral() {
    var stems = Math.max(2, Math.min(5, Math.round(W / 95)));
    for (var s = 0; s < stems; s++) {
      var x0 = W * (s + 0.5) / stems + (rnd() - 0.5) * W / stems * 0.6, y0 = H + 4;
      var sh = H * (0.4 + rnd() * 0.55), x3 = x0 + (rnd() - 0.5) * W * 0.3, y3 = H - sh;
      var x1 = x0 + (rnd() - 0.5) * 40, y1 = y0 - sh * 0.35, x2 = x3 + (rnd() - 0.5) * 50, y2 = y3 + sh * 0.3;
      parts.push('<path d="M' + f1(x0) + ' ' + f1(y0) + 'C' + f1(x1) + ' ' + f1(y1) + ' ' + f1(x2) + ' ' + f1(y2) + ' ' + f1(x3) + ' ' + f1(y3) + '"/>');
      var steps = 3 + Math.floor(rnd() * 4), side = rnd() < 0.5 ? 1 : -1;
      for (var q = 1; q < steps; q++) {
        var t = 0.15 + 0.7 * q / steps, u = 1 - t;
        var px2 = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
        var py2 = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
        var dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2);
        var dy = 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2);
        var tang = Math.atan2(dy, dx) * 180 / Math.PI;
        leaf(px2, py2, tang + side * (38 + rnd() * 22), 9 + rnd() * 9);
        if (rnd() < 0.35) leaf(px2, py2, tang - side * (38 + rnd() * 22), 7 + rnd() * 7);
        side = -side;
      }
      if (rnd() < 0.55) flower(x3, y3, 5 + rnd() * 3); else bud(x3, y3, (rnd() - 0.5) * 30);
    }
    var seeds = 5 + Math.floor(rnd() * 8);
    for (var d = 0; d < seeds; d++) parts.push('<circle class="seed" cx="' + f1(rnd() * W) + '" cy="' + f1(rnd() * H * 0.6) + '" r="' + f1(0.7 + rnd() * 0.8) + '"/>');
    }

    // Circuit board: traces rising from the bottom edge with 45-degree jogs, pads, vias and a chip
    function drawCircuit() {
      var n = 5 + Math.floor(rnd() * 4), grid = W / (n + 1);
      var chipX = W * (0.2 + rnd() * 0.45), chipY = H * (0.15 + rnd() * 0.2), cw = 46, ch = 30;
      parts.push('<path d="M' + f1(chipX) + ' ' + f1(chipY) + 'h' + cw + 'v' + ch + 'h' + (-cw) + 'Z"/>');
      parts.push('<circle class="seed" cx="' + f1(chipX + 6) + '" cy="' + f1(chipY + 6) + '" r="1.4"/>');
      for (var p = 0; p < 4; p++) {
        var pxp = chipX + 8 + p * (cw - 16) / 3;
        parts.push('<path d="M' + f1(pxp) + ' ' + f1(chipY) + 'v-6M' + f1(pxp) + ' ' + f1(chipY + ch) + 'v6"/>');
      }
      for (var t = 0; t < n; t++) {
        var x = grid * (t + 1) + (rnd() - 0.5) * grid * 0.4, y = H + 2;
        var d = 'M' + f1(x) + ' ' + f1(y), segs = 2 + Math.floor(rnd() * 3), top = H * (0.1 + rnd() * 0.55);
        for (var s = 0; s < segs; s++) {
          var rise = (y - top) / (segs - s) * (0.5 + rnd() * 0.5);
          y -= rise; d += 'L' + f1(x) + ' ' + f1(y);
          if (s < segs - 1) { var jog = (rnd() < 0.5 ? -1 : 1) * (8 + rnd() * 14); x += jog; y -= Math.abs(jog); d += 'L' + f1(x) + ' ' + f1(y); }
        }
        parts.push('<path d="' + d + '"/>');
        if (rnd() < 0.6) { parts.push('<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="3.2" fill="none" stroke="currentColor" stroke-width="0.9"/><circle class="seed" cx="' + f1(x) + '" cy="' + f1(y) + '" r="1.1"/>'); }
        else { parts.push('<path d="M' + f1(x - 3) + ' ' + f1(y) + 'h6"/>'); }
      }
      var vias = 4 + Math.floor(rnd() * 6);
      for (var v = 0; v < vias; v++) parts.push('<circle cx="' + f1(rnd() * W) + '" cy="' + f1(H * (0.1 + rnd() * 0.8)) + '" r="1.8" fill="none" stroke="currentColor" stroke-width="0.8"/>');
    }

    // Cityscape: a low skyline along the bottom edge, with window dots and the odd antenna
    function drawCity() {
      var x = -4, count = 0;
      while (x < W && count < 14) {
        var bw = 18 + rnd() * 26, bh = H * (0.18 + rnd() * 0.5);
        var bx = x, by = H - bh;
        parts.push('<path d="M' + f1(bx) + ' ' + f1(H + 2) + 'V' + f1(by) + 'H' + f1(bx + bw) + 'V' + f1(H + 2) + '"/>');
        // Window rows come from the seed and spread over the building's height
        var cols = Math.max(1, Math.floor((bw - 6) / 7)), rows = 2 + Math.floor(rnd() * 7), gap = (bh - 12) / rows;
        for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
          if (rnd() < 0.45 && gap > 3) parts.push('<circle class="seed" cx="' + f1(bx + 5 + c * 7) + '" cy="' + f1(by + 8 + r * gap) + '" r="0.9"/>');
        }
        var extra = rnd();
        if (extra < 0.18) parts.push('<path d="M' + f1(bx + bw / 2) + ' ' + f1(by) + 'v-14"/><circle class="seed" cx="' + f1(bx + bw / 2) + '" cy="' + f1(by - 15) + '" r="1.3"/>');
        else if (extra < 0.3) parts.push('<path d="M' + f1(bx + bw * 0.3) + ' ' + f1(by) + 'v-4M' + f1(bx + bw * 0.7) + ' ' + f1(by) + 'v-4M' + f1(bx + bw * 0.22) + ' ' + f1(by - 4) + 'h' + f1(bw * 0.56) + 'v-7h' + f1(-bw * 0.56) + 'Z"/>');
        x += bw + 2 + rnd() * 6; count++;
      }
      var stars = 3 + Math.floor(rnd() * 5);
      for (var st = 0; st < stars; st++) parts.push('<circle class="seed" cx="' + f1(rnd() * W) + '" cy="' + f1(rnd() * H * 0.35) + '" r="' + f1(0.6 + rnd() * 0.7) + '"/>');
    }

    // Topographic: contour lines like a hiking map, with a small summit ring
    function drawTopo() {
      var lines = 6 + Math.floor(rnd() * 5), ph = rnd() * 6.28, amp = 6 + rnd() * 10;
      for (var l = 0; l < lines; l++) {
        var base = H * (0.25 + 0.75 * (l + 1) / lines), pts = [], a = amp * (0.6 + rnd() * 0.8), ph2 = ph + l * 0.35 + rnd() * 0.4;
        for (var k = 0; k <= 24; k++) {
          var xx = W * k / 24;
          pts.push(f1(xx) + ' ' + f1(base - a * Math.sin(xx / W * 6.28 * 1.2 + ph2) - a * 0.5 * Math.sin(xx / W * 6.28 * 2.7 + ph2 * 1.7)));
        }
        parts.push('<path d="M' + pts.join('L') + '"/>');
      }
      var sx = W * (0.25 + rnd() * 0.5), sy = H * (0.12 + rnd() * 0.12);
      for (var ring = 1; ring <= 3; ring++) parts.push('<ellipse cx="' + f1(sx) + '" cy="' + f1(sy) + '" rx="' + f1(ring * 9) + '" ry="' + f1(ring * 5) + '"/>');
    }

    ({ floral: drawFloral, circuit: drawCircuit, city: drawCity, topo: drawTopo }[kind] || drawFloral)();
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'now-flora');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.style.left = padL + 'px'; svg.style.bottom = padB + 'px';
    svg.innerHTML = parts.join('');
    card.appendChild(svg);
  }
  function fitMainHeight() {
    if (!mainEl) return;
    mainEl.style.minHeight = '';
    var top = mainEl.getBoundingClientRect().top + window.scrollY;
    var need = window.innerHeight - top;
    if (mainEl.offsetHeight < need) mainEl.style.minHeight = Math.ceil(need) + 'px';
  }
  function fitPage() { fitNowCards(); fitMainHeight(); }
  fitPage();
  var fitW = window.innerWidth, fitH = window.innerHeight;
  window.addEventListener('resize', function () {
    // Phones change height as the address bar slides; only react to real resizes there.
    if (stacked.matches && window.innerWidth === fitW) return;
    if (window.innerWidth === fitW && window.innerHeight === fitH) return;
    fitW = window.innerWidth; fitH = window.innerHeight;
    fitPage();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPage);
  window.addEventListener('load', fitPage);

  // Reveal the footer last: after layout and fonts have settled (at most about a second),
  // so it never flickers into view and gets pushed down.
  (function () {
    var root = document.documentElement, done = false;
    function reveal() {
      if (done) return; done = true;
      fitPage();
      // Now page: stagger the months in order (first three one by one, the rest with the third)
      var months = document.querySelectorAll('.now-month');
      [].forEach.call(months, function (m, i) { m.style.setProperty('--i', Math.min(i, 2)); });
      requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('is-ready'); nudgeNow(); }); });
    }
    // Then a small sideways scroll and back, hinting that more months sit to the right.
    // Skipped on phones (stacked), when nothing overflows, with reduced motion, or once the
    // reader has touched the row themselves.
    function nudgeNow() {
      var row = document.querySelector('.now-timeline');
      if (!row || stacked.matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (row.scrollWidth <= row.clientWidth + 20) return;
      var touched = false, mark = function () { touched = true; };
      ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (ev) { row.addEventListener(ev, mark, { once: true, passive: true }); });
      setTimeout(function () {
        if (touched || row.scrollLeft > 2 || !row.animate) return;
        // A damped spring: slide left, then overshoot back and settle with fading swings.
        // Moves the months themselves (transform), so it can swing past the start of the row.
        var months = [].slice.call(row.querySelectorAll('.now-month'));
        var frames = [
          { transform: 'translateX(0)', easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
          { transform: 'translateX(-88px)', offset: 0.34, easing: 'cubic-bezier(0.4, 0, 0.3, 1)' },
          { transform: 'translateX(16px)', offset: 0.58, easing: 'ease-in-out' },
          { transform: 'translateX(-7px)', offset: 0.74, easing: 'ease-in-out' },
          { transform: 'translateX(3px)', offset: 0.87, easing: 'ease-in-out' },
          { transform: 'translateX(0)' }
        ];
        // Snapping would re-align the row while the months move, so pause it for the wobble
        var snap = row.style.scrollSnapType;
        row.style.scrollSnapType = 'none';
        var anims = months.map(function (m) { return m.animate(frames, { duration: 1600 }); });
        var finished = false;
        var restore = function () { if (finished) return; finished = true; row.scrollLeft = 0; row.style.scrollSnapType = snap; };
        anims[0].finished.then(restore, function () {});
        var stop = function () { anims.forEach(function (an) { an.cancel(); }); if (!finished) { finished = true; row.style.scrollSnapType = snap; } };
        ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (ev) { row.addEventListener(ev, stop, { once: true, passive: true }); });
      }, 2 * 130 + 500 + 250);
    }
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(reveal);
    setTimeout(reveal, 1200);
  })();

  // Footer index on phones and tablets: show the most-used tags, with a chip to expand the rest.
  var tagIndex = document.querySelector('.tag-index');
  var TAGS_SHOWN = 6;
  if (tagIndex) {
    var tagItems = [].slice.call(tagIndex.querySelectorAll('.tag-index-list > li'));
    if (tagItems.length > TAGS_SHOWN + 1) {
      tagItems.slice(TAGS_SHOWN).forEach(function (li) { li.classList.add('tag-extra'); });
      var hidden = tagItems.length - TAGS_SHOWN;
      var moreItem = document.createElement('li');
      moreItem.className = 'tag-more-item';
      var moreBtn = document.createElement('button');
      moreBtn.type = 'button';
      moreBtn.className = 'tag-more';
      moreBtn.setAttribute('aria-expanded', 'false');
      moreBtn.textContent = '+' + hidden + ' more';
      var tagList = tagIndex.querySelector('.tag-index-list');
      var extras = tagItems.slice(TAGS_SHOWN);
      var STAGGER = 40, POP = 220, busy = false;
      var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
      function setState(collapsed) {
        moreBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        moreBtn.textContent = collapsed ? '+' + hidden + ' more' : 'Show fewer';
      }
      // Animate the list's height from its current size to whatever it becomes after change().
      function growTo(change, duration, done) {
        var from = tagList.offsetHeight;
        change();
        var to = tagList.offsetHeight;
        tagList.style.overflow = 'hidden';
        tagList.style.height = from + 'px';
        void tagList.offsetHeight;
        tagList.style.transition = 'height ' + duration + 'ms ease';
        tagList.style.height = to + 'px';
        setTimeout(function () {
          tagList.style.height = tagList.style.transition = tagList.style.overflow = '';
          if (done) done();
        }, duration + 20);
      }
      moreBtn.addEventListener('click', function () {
        if (busy) return;
        var expanding = tagIndex.classList.contains('is-collapsed');
        if (calm.matches) { tagIndex.classList.toggle('is-collapsed'); setState(!expanding); return; }
        busy = true;
        if (expanding) {
          var total = (extras.length - 1) * STAGGER + POP;
          growTo(function () {
            tagIndex.classList.remove('is-collapsed');
            extras.forEach(function (li, i) { li.style.animationDelay = (i * STAGGER) + 'ms'; li.classList.add('tag-pop'); });
          }, Math.min(total, 700), null);
          setTimeout(function () {
            extras.forEach(function (li) { li.classList.remove('tag-pop'); li.style.animationDelay = ''; });
            busy = false;
          }, total + 40);
          setState(false);
        } else {
          extras.forEach(function (li) { li.classList.add('tag-fade'); });
          setTimeout(function () {
            growTo(function () {
              tagIndex.classList.add('is-collapsed');
              extras.forEach(function (li) { li.classList.remove('tag-fade'); });
            }, 260, function () { busy = false; });
            setState(true);
          }, 150);
        }
      });
      moreItem.appendChild(moreBtn);
      tagIndex.querySelector('.tag-index-list').appendChild(moreItem);
      tagIndex.classList.add('is-collapsed');
    }
  }

  // Overlay reader: cards open the post over the list. Direct visits and
  // modified clicks (new tab, etc.) still load the full page.
  var reader = document.querySelector('.reader');
  var body = reader && reader.querySelector('.reader-body');
  var baseTitle = document.title;
  var baseUrl = location.href;
  var pushed = false;

  // End of a post: share. Uses the phone's share sheet, or a small menu on desktop.
  function initPostActions(root) {
    root.querySelectorAll('.post-actions').forEach(function (box) {
      var url = box.getAttribute('data-url') || location.href, title = box.getAttribute('data-title') || document.title;
      var e = encodeURIComponent;
      var links = {
        twitter: 'https://twitter.com/intent/tweet?url=' + e(url) + '&text=' + e(title),
        linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + e(url),
        whatsapp: 'https://wa.me/?text=' + e(title + ' ' + url),
        email: 'mailto:?subject=' + e(title) + '&body=' + e(url)
      };
      box.querySelectorAll('a[data-share]').forEach(function (a) { a.href = links[a.getAttribute('data-share')] || '#'; });
    });
  }
  // The share button's take-off: the circle shatters, the plane climbs with flight lines behind it,
  // and the button re-forms with a freshly drawn arrow.
  function launchPlane(btn, climb) {
    var box = btn.parentNode, cx = btn.offsetLeft + btn.offsetWidth / 2, cy = btn.offsetTop + btn.offsetHeight / 2;
    var made = [];
    for (var i = 0; i < 12; i++) {
      var s = document.createElement('span'); s.className = 'share-shard';
      s.style.setProperty('--cx', cx + 'px'); s.style.setProperty('--cy', cy + 'px');
      s.style.setProperty('--a', (i * 30 + Math.random() * 14 - 7) + 'deg');
      s.style.setProperty('--d', (8 + Math.random() * 12) + 'px');
      s.style.setProperty('--spin', (Math.random() * 240 - 120) + 'deg');
      box.appendChild(s); made.push(s);
    }
    var fly = document.createElement('span'); fly.className = 'share-flight';
    fly.style.setProperty('--cx', cx + 'px'); fly.style.setProperty('--cy', cy + 'px'); fly.style.setProperty('--fly', (-climb) + 'px');
    var plane = btn.querySelector('.share-plane');
    fly.innerHTML = '<svg class="share-trail" viewBox="0 0 22 28" aria-hidden="true"><path d="M7 2v12M11 4v20M15 2v12"/></svg>' + (plane ? plane.outerHTML.replace('class="share-plane"', '') : '');
    box.appendChild(fly); made.push(fly);
    btn.classList.remove('is-forming'); btn.classList.add('is-launching', 'just-launched');
    btn.addEventListener('mouseleave', function off() { btn.classList.remove('just-launched'); btn.removeEventListener('mouseleave', off); });
    setTimeout(function () { btn.classList.remove('is-launching'); btn.classList.add('is-forming'); }, 380);
    setTimeout(function () { btn.classList.remove('is-forming'); made.forEach(function (m) { m.remove(); }); }, 1150);
  }
  function closeShareMenus(except) {
    document.querySelectorAll('.post-share-menu:not([hidden])').forEach(function (m) {
      if (m === except) return; m.hidden = true;
      var b = m.parentNode.querySelector('.post-share-button'); if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', function (ev) {
    var shareBtn = ev.target.closest('.post-share-button');
    if (shareBtn) {
      var box = shareBtn.closest('.post-actions');
      var url = box.getAttribute('data-url') || location.href, title = box.getAttribute('data-title') || document.title;
      var menu = shareBtn.parentNode.querySelector('.post-share-menu');
      var opening = menu.hidden;
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        if (!calmStamps) launchPlane(shareBtn, 130);
        setTimeout(function () { navigator.share({ title: title, url: url }).catch(function () {}); }, calmStamps ? 0 : 600);
        return;
      }
      closeShareMenus(menu);
      menu.hidden = !menu.hidden; shareBtn.setAttribute('aria-expanded', String(!menu.hidden));
      if (opening && !calmStamps) {
        launchPlane(shareBtn, menu.offsetHeight + 110); // climbs past the menu, fading just above it
        menu.classList.remove('is-rising'); void menu.offsetWidth; menu.classList.add('is-rising'); // pulled up behind the plane
      }
      return;
    }
    var copy = ev.target.closest('[data-share="copy"]');
    if (copy) {
      var link = copy.closest('.post-actions').getAttribute('data-url') || location.href;
      var copyLabel = copy.querySelector('span') || copy, label = copyLabel.textContent;
      var done = function () { copyLabel.textContent = copy.getAttribute('data-copied') || 'Link copied'; setTimeout(function () { copyLabel.textContent = label; closeShareMenus(); }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, done); else done();
      return;
    }
    if (!ev.target.closest('.post-share-menu')) closeShareMenus();
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeShareMenus(); });
  initPostActions(document);

  // Stamps: "I was here", on posts and Now cards. Needs the stamps Worker (theme setting).
  // A stamp is final. This browser keeps the stamp's private key, which is the only way to sign it.
  var calmStamps = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var awaitingName = null; // the stamp whose name line is showing, if any
  var stampApi = function (el) { return el.getAttribute('data-endpoint').replace(/\/+$/, '') + '/stamps/' + encodeURIComponent(el.getAttribute('data-slug')); };
  var myStamp = function (el) { try { return JSON.parse(localStorage.getItem('dungeon-stamp:' + el.getAttribute('data-slug')) || 'null'); } catch (e) { return null; } };
  var saveStamp = function (el, s) { try { localStorage.setItem('dungeon-stamp:' + el.getAttribute('data-slug'), JSON.stringify(s)); } catch (e) {} };
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var stampDate = function (iso, withYear) { // always "29 SEP 2026", like a real date stamp
    var d = new Date(iso); if (isNaN(d)) d = new Date();
    var s = String(d.getUTCDate()).padStart(2, '0') + ' ' + MONTHS[d.getUTCMonth()];
    return withYear ? s + ' ' + d.getUTCFullYear() : s;
  };
  function setCount(el, n) { el.querySelector('.stamp-count').textContent = n > 0 ? n : ''; }
  // The name field is exactly as wide as its text (or the prompt), so typing starts at the cursor
  function sizeName(input) {
    var prompt = input.parentNode.querySelector('.stamp-prompt');
    input.style.setProperty('--n', Math.max(input.value.length + 1, prompt ? prompt.textContent.length : 10));
  }
  // Names signed in this browser session can be taken back; after that they stay
  var signedNow = function (el, mine) { try { return !!mine && sessionStorage.getItem('dungeon-signed:' + el.getAttribute('data-slug')) === String(mine.id); } catch (e) { return false; } };
  function showMark(el, mine, fresh) {
    var mark = el.querySelector('.stamp-mark'), nameBox = mark.querySelector('.stamp-name');
    mark.querySelector('.stamp-date').textContent = stampDate(mine.date, true);
    mark.classList.toggle('is-signed', !!mine.name);
    mark.querySelector('.stamp-signed').textContent = mine.name || '';
    mark.querySelector('.stamp-unsign').hidden = !(mine.name && signedNow(el, mine));
    var nameInput = mark.querySelector('.stamp-name input'); if (!mine.name) { nameInput.value = ''; nameBox.classList.remove('has-value'); } sizeName(nameInput);
    mark.classList.toggle('name-gone', !mine.name && !fresh);
    mark.hidden = false; el.classList.add('is-stamped');
    if (!fresh || calmStamps) return;
    mark.classList.remove('is-landing'); void mark.offsetWidth; mark.classList.add('is-landing');
    if (mine.name) return;
    awaitingName = el; // typing now goes straight into this stamp's name line
    clearTimeout(el._nameTimer);
    el._nameTimer = setTimeout(function () { // the name line fades unless they've started signing
      var input = nameBox.querySelector('input');
      if (document.activeElement !== input && !input.value) { mark.classList.add('name-gone'); if (awaitingName === el) awaitingName = null; }
    }, 5000);
  }
  function renderList(el) {
    var d = el._stamps || { names: [], more: 0 }, mine = myStamp(el);
    var rows = el.querySelector('.stamp-list-rows'); rows.textContent = '';
    if (mine && !mine.name) {
      var row = document.createElement('div'); row.className = 'stamp-list-row';
      var b = document.createElement('b'); b.textContent = stampDate(mine.date, false);
      var input = document.createElement('input'); input.type = 'text'; input.maxLength = 24;
      input.placeholder = el.querySelector('.stamp-prompt').textContent; input.setAttribute('aria-label', input.placeholder);
      input.className = 'stamp-list-input'; row.appendChild(b); row.appendChild(input); rows.appendChild(row);
    }
    d.names.forEach(function (n) {
      var row = document.createElement('div'); row.className = 'stamp-list-row';
      var b = document.createElement('b'); b.textContent = stampDate(n.date, false);
      var s = document.createElement('span'); s.textContent = n.name;
      row.appendChild(b); row.appendChild(s);
      if (mine && n.id === mine.id && signedNow(el, mine)) { // your own name, signed this session
        var x = document.createElement('button'); x.type = 'button'; x.className = 'stamp-list-unsign'; x.innerHTML = '&times;';
        x.setAttribute('aria-label', el.querySelector('.stamp-list').getAttribute('data-remove') || 'Remove my name'); row.appendChild(x);
      }
      rows.appendChild(row);
    });
    var more = el.querySelector('.stamp-more');
    var rest = d.more - (mine && !mine.name ? 1 : 0); // your own unsigned stamp already has its row
    more.textContent = rest > 0 ? '+ ' + rest + ' ' + (more.getAttribute('data-word') || 'more') : '';
  }
  function closeStampLists(except) {
    document.querySelectorAll('.stamp-list:not([hidden])').forEach(function (l) {
      if (l === except) return; l.hidden = true;
      var b = l.parentNode.querySelector('.stamp-btn'); if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  function initStamps(root) {
    root.querySelectorAll('.stamp').forEach(function (el) {
      if (el.getAttribute('data-ready')) return;
      el.setAttribute('data-ready', '1');
      fetch(stampApi(el)).then(function (r) { if (!r.ok) throw r; return r.json(); }).then(function (d) {
        el._stamps = d; setCount(el, d.count); el.hidden = false; // only shown once the Worker answers
        var mine = myStamp(el); if (mine) showMark(el, mine, false);
      }).catch(function () {});
    });
  }
  function stampIt(el) {
    var before = (el._stamps && el._stamps.count) || 0, btn = el.querySelector('.stamp-btn');
    el.classList.remove('is-going'); void btn.offsetWidth;
    if (!calmStamps) el.classList.add('is-going');
    var pressed = new Promise(function (res) { setTimeout(res, calmStamps ? 0 : 700); }).then(function () {
      setCount(el, before + 1); var c = el.querySelector('.stamp-count'); c.classList.remove('is-bumping'); void c.offsetWidth; c.classList.add('is-bumping');
    });
    var landed = new Promise(function (res) { setTimeout(res, calmStamps ? 0 : 900); });
    var sent = fetch(stampApi(el), { method: 'POST' }).then(function (r) { if (!r.ok) throw r; return r.json(); });
    Promise.all([sent, pressed, landed]).then(function (out) {
      var d = out[0]; el._stamps = { count: d.count, names: d.names, more: d.more }; setCount(el, d.count);
      var mine = { id: d.id, token: d.token, date: new Date().toISOString() }; saveStamp(el, mine);
      el.classList.remove('is-going'); showMark(el, mine, true);
    }, function () { el.classList.remove('is-going'); setCount(el, before); }); // refused or unreachable: undo
  }
  function signStamp(el, input) {
    var name = input.value.replace(/\s+/g, ' ').trim(), mine = myStamp(el);
    if (!name || !mine || mine.name || el._signing) return;
    el._signing = true;
    fetch(stampApi(el) + '/' + mine.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: mine.token, name: name }) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; }); })
      .then(function (res) {
        el._signing = false;
        if (res.ok || res.status === 409) {
          mine.name = name; saveStamp(el, mine);
          if (res.ok) { try { sessionStorage.setItem('dungeon-signed:' + el.getAttribute('data-slug'), String(mine.id)); } catch (e) {} }
          if (res.ok) el._stamps = { count: res.d.count, names: res.d.names, more: res.d.more };
          clearTimeout(el._nameTimer); if (awaitingName === el) awaitingName = null; showMark(el, mine, false); renderList(el); input.blur();
        } else {
          var box = input.closest('.stamp-name, .stamp-list-row'); input.title = el.getAttribute('data-bad-name') || 'Name not allowed';
          box.classList.remove('is-invalid'); void box.offsetWidth; box.classList.add('is-invalid');
        }
      }, function () { el._signing = false; });
  }
  // Already stamped: a small note by the icon, then the list of names opens as before
  function stampToast(el) {
    var t = el.querySelector('.stamp-toast');
    if (!t) { t = document.createElement('span'); t.className = 'stamp-toast'; t.setAttribute('role', 'status'); t.textContent = el.getAttribute('data-marked') || 'You left your mark already'; el.appendChild(t); }
    t.classList.remove('is-showing'); void t.offsetWidth; t.classList.add('is-showing');
    clearTimeout(el._toastTimer); el._toastTimer = setTimeout(function () { t.classList.remove('is-showing'); }, 1900);
  }
  function unsignStamp(el) {
    var mine = myStamp(el); if (!mine || !mine.name || el._signing) return;
    el._signing = true;
    fetch(stampApi(el) + '/' + mine.id, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: mine.token }) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        el._signing = false;
        try { sessionStorage.removeItem('dungeon-signed:' + el.getAttribute('data-slug')); } catch (e) {}
        if (!res.ok) { showMark(el, mine, false); renderList(el); return; } // too late: the name stays, the x goes
        delete mine.name; saveStamp(el, mine);
        el._stamps = { count: res.d.count, names: res.d.names, more: res.d.more };
        showMark(el, mine, true); renderList(el); // the name line comes back, ready for a new name
      }, function () { el._signing = false; });
  }
  document.addEventListener('click', function (ev) {
    var unsign = ev.target.closest('.stamp-unsign, .stamp-list-unsign');
    if (unsign) { unsignStamp(unsign.closest('.stamp')); return; }
    var btn = ev.target.closest('.stamp-btn');
    if (btn) {
      var el = btn.closest('.stamp');
      if (!myStamp(el)) { closeStampLists(); stampIt(el); return; }
      var list = el.querySelector('.stamp-list'); closeStampLists(list);
      if (list.hidden) { renderList(el); stampToast(el); }
      list.hidden = !list.hidden; btn.setAttribute('aria-expanded', String(!list.hidden));
      if (!list.hidden && !calmStamps) { list.classList.remove('is-opening'); void list.offsetWidth; list.classList.add('is-opening'); }
      if (!list.hidden) { var i = list.querySelector('input'); if (i && window.matchMedia('(pointer: fine)').matches) i.focus(); }
      return;
    }
    if (!ev.target.closest('.stamp-list')) closeStampLists();
  });
  document.addEventListener('input', function (ev) {
    if (ev.target.matches('.stamp-name input')) { ev.target.closest('.stamp-name').classList.toggle('has-value', !!ev.target.value); sizeName(ev.target); }
  });
  document.addEventListener('keydown', function (ev) {
    // Just stamped, name line showing: the first letters typed go straight into it, no click needed.
    // Only plain characters, only when nothing else is being typed into, and never shortcuts.
    if (awaitingName && ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey && ev.key !== ' ') {
      var active = document.activeElement;
      var typingElsewhere = active && (active.isContentEditable || /^(input|textarea|select)$/i.test(active.tagName));
      var mk = awaitingName.querySelector('.stamp-mark');
      if (!typingElsewhere && !mk.hidden && !mk.classList.contains('name-gone') && !mk.classList.contains('is-signed')) {
        var nameInput = mk.querySelector('.stamp-name input');
        ev.preventDefault();
        nameInput.focus({ preventScroll: true });
        if (nameInput.value.length < nameInput.maxLength) nameInput.value += ev.key;
        sizeName(nameInput);
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        clearTimeout(awaitingName._nameTimer);
        return;
      }
    }
    if (ev.key === 'Escape') { closeStampLists(); return; }
    if (ev.key === 'Enter' && ev.target.matches('.stamp-name input, .stamp-list-input')) { ev.preventDefault(); signStamp(ev.target.closest('.stamp'), ev.target); }
  });
  document.addEventListener('focusout', function (ev) {
    if (!ev.target.matches || !ev.target.matches('.stamp-name input')) return;
    var el = ev.target.closest('.stamp'), input = ev.target;
    if (input.value.trim()) { signStamp(el, input); return; }
    clearTimeout(el._nameTimer); el._nameTimer = setTimeout(function () { if (!input.value) { el.querySelector('.stamp-mark').classList.add('name-gone'); if (awaitingName === el) awaitingName = null; } }, 2500);
  });
  initStamps(document);

  // Stickies: short notes readers leave under a post, pinned once approved. Needs the stamps Worker
  // and a Turnstile site key (theme settings). The pile: early stickies spread out, later ones land on
  // top; tapping one sends it to the back. A writer sees their own sticky straight away, marked as
  // waiting, and can take it back during the same visit. Text is only ever shown as plain text.
  var stickyApi = function (el) { return el.getAttribute('data-endpoint').replace(/\/+$/, '') + '/stickies/' + encodeURIComponent(el.getAttribute('data-slug')); };
  var mineKey = function (el) { return 'dungeon-stickies:' + el.getAttribute('data-slug'); };
  var myStickies = function (el) { try { return JSON.parse(localStorage.getItem(mineKey(el)) || '[]'); } catch (e) { return []; } };
  var saveMyStickies = function (el, list) { try { localStorage.setItem(mineKey(el), JSON.stringify(list.slice(-20))); } catch (e) {} };
  var pinnedNow = function (id) { try { return sessionStorage.getItem('dungeon-sticky-now:' + id) === '1'; } catch (e) { return false; } };
  var paperOf = function (s) { return String(s.colour === 0 || s.colour > 0 ? s.colour : Math.abs(Number(s.id)) % 6); };
  var stickyDate = function (iso) { var d = new Date(iso); if (isNaN(d)) d = new Date(); return String(d.getUTCDate()).padStart(2, '0') + ' ' + MONTHS[d.getUTCMonth()]; };
  function seeded(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // A frayed paper edge: an outline with rounded corners and a slightly uneven border, worked out from the
  // sticky's own number, so each one differs but stays the same on every visit.
  function frayClip(id) {
    var r = seeded(Math.abs(Number(id)) * 9973 + 17), R = 7, pts = [];
    var nudge = function () { return (r() < 0.14 ? 1.2 + r() * 1.6 : r() * 1.1).toFixed(2); };
    var at = function (xp, xpx, yp, ypx) { return 'calc(' + xp + '% + ' + xpx + 'px) calc(' + yp + '% + ' + ypx + 'px)'; };
    var arc = function (cxp, cxpx, cyp, cypx, from) {
      for (var k = 0; k <= 3; k++) { var t = (from + k * 30) * Math.PI / 180; pts.push(at(cxp, (cxpx + R * Math.cos(t)).toFixed(2), cyp, (cypx + R * Math.sin(t)).toFixed(2))); }
    };
    var t;
    arc(0, R, 0, R, 180); for (t = 9; t <= 91; t += 7) pts.push(at(t, 0, 0, nudge()));
    arc(100, -R, 0, R, 270); for (t = 9; t <= 91; t += 7) pts.push(at(100, -nudge(), t, 0));
    arc(100, -R, 100, -R, 0); for (t = 91; t >= 9; t -= 7) pts.push(at(t, 0, 100, -nudge()));
    arc(0, R, 100, -R, 90); for (t = 91; t >= 9; t -= 7) pts.push(at(0, nudge(), t, 0));
    return 'polygon(' + pts.join(',') + ')';
  }
  function stickyNode(el, s, waiting) {
    var n = document.createElement('div');
    n.className = 'sticky' + (waiting ? ' is-waiting' : ''); n.setAttribute('role', 'listitem'); n.tabIndex = 0;
    n.setAttribute('data-id', s.id); n.setAttribute('data-c', paperOf(s));
    var paper = document.createElement('div'); paper.className = 'sticky-paper'; paper.style.setProperty('--fray', frayClip(s.id));
    if (waiting) { var w = document.createElement('span'); w.className = 'sticky-waiting'; w.textContent = el.getAttribute('data-waiting'); paper.appendChild(w); }
    var p = document.createElement('p'); p.className = 'sticky-text'; p.textContent = s.body; paper.appendChild(p);
    var foot = document.createElement('div'); foot.className = 'sticky-foot';
    var by = document.createElement('span'); by.className = 'sticky-by'; by.textContent = s.name || ''; foot.appendChild(by);
    if (pinnedNow(s.id)) { var x = document.createElement('button'); x.type = 'button'; x.className = 'sticky-remove'; x.innerHTML = '&times;'; x.setAttribute('aria-label', el.getAttribute('data-remove')); foot.appendChild(x); }
    paper.appendChild(foot); n.appendChild(paper);
    n.setAttribute('aria-label', s.body + (s.name ? ', ' + s.name : '') + '. ' + el.getAttribute('data-send-back'));
    return n;
  }
  // Doodles: a short sticky leaves empty paper, so it gets a small line drawing there. If the post's tags
  // match a topic, the doodle fits it; otherwise it's a random one. Each sticky keeps the same doodle.
  var DOODLES = {
    music: ['M17 34a4 3 0 1 1-8 0a4 3 0 1 1 8 0zM35 30a4 3 0 1 1-8 0a4 3 0 1 1 8 0zM17 34V12l18-4v22M17 18l18-4',
            'M10 30v-4a14 14 0 0 1 28 0v4M10 28h5v11h-5zM33 28h5v11h-5z',
            'M30 8l10 10M34 12l-9 9M22 22c-4-3-10-2-12 2c-2 3 0 5-2 8c-2 4 2 9 7 8c3-1 3-4 7-5c4-1 6-6 3-10zM16 32a2 2 0 1 0 4 0a2 2 0 1 0-4 0'],
    lab: ['M10 10h28v10H10zM10 24h28v10H10zM14 15h2M14 29h2M22 15h12M22 29h12M18 38v4M30 38v4M14 42h20',
          'M18 8v8M30 8v8M14 16h20v6a10 10 0 0 1-20 0zM24 32v10',
          'M8 12h32v24H8zM14 20l5 4-5 4M22 29h8'],
    ghost: ['M14 40V22a10 10 0 0 1 20 0v18l-3.3-3-3.3 3-3.4-3-3.3 3-3.4-3zM20 24h.01M28 24h.01',
            'M12 36l4 4 22-22-4-4zM12 36l-2 6 6-2M30 14l4 4'],
    f1: ['M12 42V8M12 9h24v16H12M12 17h24M20 9v16M28 9v16',
         'M24 8a16 16 0 1 1 0 32a16 16 0 1 1 0-32M24 16a8 8 0 1 1 0 16a8 8 0 1 1 0-16M24 8v8M24 32v8M8 24h8M32 24h8'],
    books: ['M24 14c-4-3-10-4-16-3v24c6-1 12 0 16 3c4-3 10-4 16-3V11c-6-1-12 0-16 3zM24 14v24',
            'M38 8C24 10 14 22 12 38M38 8c-2 10-10 18-20 22M16 30l6 1'],
    health: ['M12 18h20v12a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8zM32 21h3a4 4 0 0 1 0 8h-3M18 8c-2 3 2 5 0 8M24 8c-2 3 2 5 0 8',
             'M14 30c-3 0-4-4-4-8s2-8 4-8 4 4 4 8-1 8-4 8zM32 22c-3 0-4-4-4-8s2-8 4-8 4 4 4 8-1 8-4 8zM14 35h.01M32 27h.01',
             'M24 16c-6-4-14 0-13 9 1 10 7 15 13 12 6 3 12-2 13-12 1-9-7-13-13-9zM24 16c0-4 2-7 5-8'],
    product: ['M18 30c-4-3-6-7-5-12a11 11 0 0 1 22 0c1 5-1 9-5 12v4H18zM19 38h10M21 42h6',
              'M24 17a7 7 0 1 1 0 14a7 7 0 1 1 0-14M24 6v5M24 37v5M6 24h5M37 24h5M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4',
              'M8 8v32h32M14 32l8-8 6 5 10-13M33 16h5v5'],
    any: ['M24 8l4.7 10 11 1.3-8.2 7.5 2.2 10.9L24 32.3 14.3 37.7l2.2-10.9L8.3 19.3l11-1.3z',
          'M24 38S10 30 10 20a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 10-14 18-14 18z',
          'M24 8a16 16 0 1 1 0 32a16 16 0 1 1 0-32M18 20h.01M30 20h.01M17 28c4 5 10 5 14 0',
          'M24 24c0-2 3-2 3 0 0 4-6 4-6 0 0-6 9-6 9 0 0 8-12 8-12 0 0-10 15-10 15 0',
          'M24 17a7 7 0 1 1 0 14a7 7 0 1 1 0-14M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5L37 37M37 11l-3.5 3.5M14.5 33.5L11 37',
          'M24 21a3 3 0 1 0 0 6a3 3 0 1 0 0-6M24 21c-3-6 0-12 0-12s3 6 0 12M27 24c6-3 12 0 12 0s-6 3-12 0M24 27c3 6 0 12 0 12s-3-6 0-12M21 24c-6 3-12 0-12 0s6-3 12 0',
          'M8 24l32-14-10 30-6-12zM24 28l16-18']
  };
  var TOPICS = [['music', /music|linkin|concert|song|album/], ['lab', /homelab|self-host|docker|nas|raspberry|pi-hole|server|asustor|network/],
    ['ghost', /ghost|design|theme/], ['f1', /(^|-)f1($|-)|formula|racing/], ['books', /book|reading|fantasy|tolkien|comic/],
    ['health', /health|walking|nutri|fitness|food|coffee/], ['product', /product|agile|platform|(^|-)ai($|-)|b2b|saas|habit/]];
  function doodleSet(el) {
    var tags = (el.getAttribute('data-topics') || '').split(/\s+/).filter(Boolean), sets = [];
    TOPICS.forEach(function (t) { if (tags.some(function (tag) { return t[1].test(tag); })) sets.push(t[0]); });
    return sets.length ? sets.reduce(function (all, s) { return all.concat(DOODLES[s]); }, []) : DOODLES.any;
  }
  function addDoodle(el, n, s) {
    var p = n.querySelector('.sticky-text'), paper = n.querySelector('.sticky-paper');
    if (!p || n.style.height) return; // a sticky that had to grow has no room to spare
    var box = p.clientHeight; p.style.flex = 'none'; var used = p.offsetHeight; p.style.flex = ''; // the text's own height, untilted
    var free = box - used; if (free < box * 0.4) return;
    var size = Math.min((free - 12) / 1.25, p.clientWidth * 0.5, 64); if (size < 28) return; // room for it tilted, plus a gap
    var rand = seeded(Math.abs(Number(s.id)) * 31 + 5), set = doodleSet(el), path = set[Math.floor(rand() * set.length)];
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 48 48'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'sticky-doodle');
    var d = document.createElementNS('http://www.w3.org/2000/svg', 'path'); d.setAttribute('d', path); svg.appendChild(d);
    var left = paper.clientWidth * 0.1 + rand() * Math.max(0, paper.clientWidth * 0.8 - size);
    var tilted = size * 1.25, spare = Math.max(0, free - 12 - tilted); // a tilted doodle needs a bigger square
    var top = p.offsetTop + used + 8 + (tilted - size) / 2 + spare * (0.25 + rand() * 0.5);
    svg.style.width = size + 'px'; svg.style.height = size + 'px'; svg.style.left = left + 'px'; svg.style.top = top + 'px';
    svg.style.transform = 'rotate(' + ((rand() - 0.5) * 24).toFixed(1) + 'deg)';
    paper.appendChild(svg);
  }
  // Longer stickies are written smaller, like on a real sticky note, down to a readable minimum; a sticky
  // that still doesn't fit grows taller rather than letting its text run over the name.
  function fitSticky(n) {
    var p = n.querySelector('.sticky-text'); if (!p) return;
    p.style.fontSize = '';
    var max = parseFloat(getComputedStyle(p).fontSize), min = Math.max(12.5, max * 0.64);
    if (p.scrollHeight <= p.clientHeight + 1) return;
    var lo = min, hi = max;
    for (var i = 0; i < 7; i++) { var mid = (lo + hi) / 2; p.style.fontSize = mid + 'px'; if (p.scrollHeight <= p.clientHeight + 1) lo = mid; else hi = mid; }
    p.style.fontSize = lo + 'px';
    if (p.scrollHeight > p.clientHeight + 1) n.style.height = (n.offsetHeight + (p.scrollHeight - p.clientHeight) + 4) + 'px';
  }
  // Lay out the pile. Oldest first, each sticky takes the emptiest of 30 random spots (seeded, so the
  // pile looks the same on every visit and only changes as stickies are added).
  function layoutStickies(el) {
    var board = el.querySelector('.stickies-board'), list = el.querySelector('.stickies-list');
    var approved = (el._stickies || []).slice(), mine = myStickies(el).filter(function (m) { return m.status === 'pending'; });
    var shownIds = {}; approved.forEach(function (s) { shownIds[s.id] = true; });
    mine = mine.filter(function (m) { return !shownIds[m.id]; });
    board.textContent = ''; list.textContent = '';
    var all = approved.slice().reverse().map(function (s) { return { s: s, waiting: false }; }).concat(mine.map(function (m) { return { s: m, waiting: true }; }));
    el.classList.toggle('is-empty', !all.length);
    if (!all.length) return;
    all.slice().reverse().forEach(function (item) { // the list: newest first
      var d = document.createElement('div'); d.setAttribute('role', 'listitem'); d.setAttribute('data-c', paperOf(item.s));
      d.style.setProperty('--fray', frayClip(item.s.id));
      if (item.waiting) d.className = 'is-waiting';
      d.appendChild(document.createTextNode(item.s.body));
      var meta = document.createElement('span');
      meta.textContent = (item.s.name || el.getAttribute('data-anonymous')) + ' · ' + stickyDate(item.s.date || item.s.created) + (item.waiting ? ' · ' + el.getAttribute('data-waiting') : '');
      d.appendChild(meta);
      if (pinnedNow(item.s.id)) { var x = document.createElement('button'); x.type = 'button'; x.className = 'sticky-remove'; x.setAttribute('data-id', item.s.id); x.innerHTML = '&times;'; x.setAttribute('aria-label', el.getAttribute('data-remove')); d.appendChild(x); }
      list.appendChild(d);
    });
    var W = board.clientWidth;
    if (!W) return; // not visible yet (the list view, say): laid out again when shown
    var probe = stickyNode(el, { id: 0, body: '' }, false); probe.style.visibility = 'hidden'; board.appendChild(probe);
    var nw = probe.offsetWidth, nh = probe.offsetHeight; board.removeChild(probe);
    // The area grows with the pile: as many rows as the stickies need, up to the maximum height.
    var maxH = parseFloat(getComputedStyle(board).maxHeight) || 496;
    // Off-limits: where the writing sticky and the list icon hang over the board (wide screens only)
    var br = board.getBoundingClientRect(), keepOut = [];
    ['.stickies-compose', '.stickies-head'].forEach(function (sel) {
      var e = el.querySelector(sel); if (!e || getComputedStyle(e).position !== 'absolute') return;
      var r = e.getBoundingClientRect(); if (!r.width) return;
      keepOut.push({ x1: r.left - br.left - 14, y1: r.top - br.top - 14, x2: r.right - br.left + 14, y2: r.bottom - br.top + 14 });
    });
    var clashes = function (x, y) { return keepOut.some(function (k) { return x < k.x2 && x + nw > k.x1 && y < k.y2 && y + nh > k.y1; }); };
    var perRow = Math.max(1, Math.floor(W / (nw * 1.12))), gapX = (W - perRow * nw) / perRow, slots = [];
    for (var sIdx = 0; slots.length < all.length && sIdx < 400; sIdx++) {
      var sc = sIdx % perRow, sr = Math.floor(sIdx / perRow), sx = sc * (nw + gapX) + gapX / 2, sy = sr * nh * 1.1 + 10;
      if (!clashes(sx, sy)) slots.push({ x: sx, y: sy });
    }
    var lastRow = slots.length ? slots[slots.length - 1].y : 10;
    var need = lastRow + nh * 1.1 + 14, crowded = need > maxH, H = Math.max(nh + 24, Math.min(maxH, need));
    board.style.height = H + 'px'; el.classList.toggle('is-crowded', crowded);
    var rand = seeded(7), placed = [];
    all.forEach(function (item, i) {
      var best = null, bestD = -1;
      if (!crowded) { // room for everyone: loose rows, each sticky a little off its spot
        var slot = slots[i], jx = (rand() - 0.5) * gapX * 0.6, jy = (rand() - 0.5) * 12;
        best = { x: Math.max(0, Math.min(W - nw, slot.x + jx)), y: Math.max(0, Math.min(H - nh, slot.y + jy)) };
        if (clashes(best.x, best.y)) best = { x: slot.x, y: slot.y };
      } else for (var k = 0; k < 30; k++) { // crowded: each takes the emptiest of 30 spots, and the pile builds up
        var x = rand() * Math.max(1, W - nw), y = rand() * Math.max(1, H - nh), d = 1e9;
        for (var q = 0; q < placed.length; q++) d = Math.min(d, Math.hypot(placed[q].x - x, placed[q].y - y));
        if (clashes(x, y)) d = -1; // never under the writing sticky
        if (d > bestD) { bestD = d; best = { x: x, y: y }; }
      }
      placed.push(best);
      var n = stickyNode(el, item.s, item.waiting);
      var rot = 'rotate(' + ((rand() - 0.5) * 14).toFixed(1) + 'deg)';
      n.style.setProperty('--rot', rot); n.style.transform = rot;
      n.style.left = best.x + 'px'; n.style.top = best.y + 'px'; n.style.zIndex = i + 1;
      if (item.s.id === el._landing) n.classList.add('is-landing');
      board.appendChild(n); fitSticky(n); addDoodle(el, n, item.s);
    });
    el._landing = null;
  }
  function sendStickyBack(el, n) {
    if (n.getAttribute('data-moving')) return;
    var board = el.querySelector('.stickies-board'), notes = [].slice.call(board.children);
    var min = Math.min.apply(null, notes.map(function (x) { return +x.style.zIndex; }));
    var rot = n.style.getPropertyValue('--rot');
    if (calmStamps || !n.animate) { notes.forEach(function (x) { if (x !== n) x.style.zIndex = +x.style.zIndex + 1; }); n.style.zIndex = min; return; }
    n.setAttribute('data-moving', '1');
    var r = n.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var under = document.elementsFromPoint(cx, cy).map(function (e) { return e.closest && e.closest('.sticky'); }).filter(function (x) { return x && x !== n; })[0];
    var b = board.getBoundingClientRect(), dx = cx - (b.left + b.width / 2), dy = cy - (b.top + b.height / 2), len = Math.hypot(dx, dy) || 1;
    var ox = dx / len * 150, oy = dy / len * 95;
    var stage = el.querySelector('.stickies-stage').getBoundingClientRect(), m = 6; // keep the pulled-out sticky inside the moving area
    ox = Math.max(stage.left + m - r.left, Math.min(stage.right - m - r.right, ox));
    oy = Math.max(stage.top + m - r.top, Math.min(stage.bottom - m - r.bottom, oy));
    var out = n.animate([
      { transform: rot + ' translate(0,0) scale(1)' },
      { transform: rot + ' translate(0,-6px) scale(1.06)', offset: 0.3 },
      { transform: rot + ' translate(' + ox + 'px,' + oy + 'px) scale(1.06)' }
    ], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
    out.onfinish = function () {
      notes.forEach(function (x) { if (x !== n) x.style.zIndex = +x.style.zIndex + 1; }); n.style.zIndex = min;
      var back = n.animate([
        { transform: rot + ' translate(' + ox + 'px,' + oy + 'px) scale(1.06)', filter: 'brightness(1)' },
        { transform: rot + ' translate(0,0) scale(.97)', filter: 'brightness(.9)', offset: 0.8 },
        { transform: rot + ' translate(0,0) scale(1)', filter: 'brightness(.96)' }
      ], { duration: 900, easing: 'cubic-bezier(.25,.7,.3,1)', fill: 'forwards' });
      out.cancel();
      back.onfinish = function () { back.cancel(); n.style.transform = rot; n.style.filter = 'brightness(.96)'; n.removeAttribute('data-moving'); };
      if (under) { var ur = under.style.getPropertyValue('--rot'); under.style.filter = ''; under.animate([{ transform: ur + ' scale(1)' }, { transform: ur + ' translateY(-4px) scale(1.03)' }, { transform: ur + ' scale(1)' }], { duration: 420, delay: 420, easing: 'ease-out' }); }
    };
  }
  var turnstileLoading = null;
  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve();
    if (turnstileLoading) return turnstileLoading;
    turnstileLoading = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
      s.onload = function () { res(); }; s.onerror = rej; document.head.appendChild(s);
    });
    return turnstileLoading;
  }
  // The writing sticky is always there. It gets a random paper colour, and the pinned sticky keeps it.
  function newPaper(el) {
    var form = el.querySelector('.stickies-compose'), prev = form.getAttribute('data-c'), c;
    do { c = String(Math.floor(Math.random() * 6)); } while (c === prev);
    form.setAttribute('data-c', c);
  }
  // Cloudflare's spam check loads only when someone starts writing, not on every visit.
  function startSpamCheck(el) {
    if (el._widget !== undefined) return;
    el._widget = null;
    var form = el.querySelector('.stickies-compose');
    loadTurnstile().then(function () {
      el._widget = window.turnstile.render(form.querySelector('.stickies-turnstile'), {
        sitekey: el.getAttribute('data-sitekey'), appearance: 'interaction-only', theme: 'light',
        callback: function (t) { el._ts = t; }, 'expired-callback': function () { el._ts = null; }, 'error-callback': function () { el._ts = null; }
      });
    }, function () {});
  }
  function clearComposer(el) {
    var form = el.querySelector('.stickies-compose');
    form.querySelector('textarea').value = ''; form.querySelector('input').value = '';
    var left = form.querySelector('.stickies-left'); left.textContent = '200'; left.classList.remove('is-low');
    form.querySelector('.stickies-msg').textContent = '';
  }
  function restick(el) {
    var form = el.querySelector('.stickies-compose');
    newPaper(el); form.classList.remove('is-restuck'); void form.offsetWidth; form.classList.add('is-restuck');
  }
  // The x: the sticky is crumpled into a ball and thrown off the page in a random direction,
  // and a fresh one is stuck in its place.
  function throwComposer(el) {
    var form = el.querySelector('.stickies-compose'), r = form.getBoundingClientRect();
    clearComposer(el);
    if (calmStamps || !document.body.animate) { restick(el); return; }
    var ball = document.createElement('div'); ball.className = 'sticky-ball'; ball.setAttribute('data-c', form.getAttribute('data-c'));
    ball.style.left = r.left + 'px'; ball.style.top = r.top + 'px'; ball.style.width = r.width + 'px'; ball.style.height = r.height + 'px';
    (form.closest('dialog') || document.body).appendChild(ball); // inside the overlay when thrown from there
    form.style.visibility = 'hidden';
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2, a = Math.random() * Math.PI * 2;
    var reach = Math.max(innerWidth, innerHeight) * 0.9, dx = Math.cos(a) * reach, dy = Math.sin(a) * reach;
    var spin = (Math.random() < 0.5 ? -1 : 1) * (540 + Math.random() * 360);
    var fly = ball.animate([
      { transform: 'rotate(-3deg) scale(1)', borderRadius: '7px', boxShadow: '0 0 0 rgba(0,0,0,0)' },
      { transform: 'rotate(30deg) scale(0.62, 0.5)', borderRadius: '38%', boxShadow: 'inset -8px -10px 18px rgba(0,0,0,.22), inset 6px 6px 12px rgba(255,255,255,.45)', offset: 0.16 },
      { transform: 'rotate(110deg) scale(0.3)', borderRadius: '50%', boxShadow: 'inset -10px -12px 16px rgba(0,0,0,.28), inset 6px 6px 10px rgba(255,255,255,.5)', offset: 0.3 },
      { transform: 'translate(' + (dx * 0.4) + 'px,' + (dy * 0.4 - 90) + 'px) rotate(' + (spin * 0.5) + 'deg) scale(0.27)', borderRadius: '50%', offset: 0.62 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + spin + 'deg) scale(0.24)', borderRadius: '50%' }
    ], { duration: 1150, easing: 'cubic-bezier(.3,.55,.45,1)', fill: 'forwards' });
    setTimeout(function () { form.style.visibility = ''; restick(el); }, 380);
    fly.onfinish = function () { ball.remove(); };
  }
  function waitForToken(el, ms) {
    return new Promise(function (res) { var t0 = Date.now(); (function poll() { if (el._ts || Date.now() - t0 > ms) res(el._ts || null); else setTimeout(poll, 200); })(); });
  }
  function pinSticky(el) {
    var form = el.querySelector('.stickies-compose'), text = form.querySelector('textarea'), nameIn = form.querySelector('input'), msg = form.querySelector('.stickies-msg'), btn = form.querySelector('.stickies-pin');
    var body = text.value.trim(); if (!body) { text.focus(); return; }
    btn.disabled = true; msg.textContent = el._ts ? '' : el.getAttribute('data-checking');
    waitForToken(el, 10000).then(function (token) {
      return fetch(stickyApi(el), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: body, name: nameIn.value.trim(), colour: Number(form.getAttribute('data-c')), turnstile: token }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; }); });
    }).then(function (res) {
      btn.disabled = false; el._ts = null;
      if (el._widget !== null && el._widget !== undefined && window.turnstile) { try { window.turnstile.reset(el._widget); } catch (e) {} }
      if (!res.ok) {
        var e = (res.d && res.d.error) || '';
        msg.textContent = res.status === 429 ? el.getAttribute('data-err-slow') : /spam/.test(e) ? el.getAttribute('data-err-spam') : /name/.test(e) ? el.getAttribute('data-err-name') : el.getAttribute('data-err-other');
        return;
      }
      var mine = myStickies(el); mine.push({ id: res.d.id, token: res.d.token, body: body, name: nameIn.value.trim() || null, colour: Number(form.getAttribute('data-c')), created: new Date().toISOString(), status: 'pending' });
      saveMyStickies(el, mine);
      try { sessionStorage.setItem('dungeon-sticky-now:' + res.d.id, '1'); } catch (e2) {}
      clearComposer(el); restick(el); el._landing = res.d.id; layoutStickies(el);
    }, function () { btn.disabled = false; msg.textContent = el.getAttribute('data-err-other'); });
  }
  function takeBackSticky(el, id) {
    var mine = myStickies(el), m = mine.filter(function (x) { return String(x.id) === String(id); })[0]; if (!m) return;
    fetch(stickyApi(el) + '/' + m.id, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: m.token }) })
      .then(function (r) { if (!r.ok) throw r; }).then(function () {
        saveMyStickies(el, mine.filter(function (x) { return x !== m; }));
        if ((el._stickies || []).some(function (s) { return String(s.id) === String(id); })) { el._stickies = el._stickies.filter(function (s) { return String(s.id) !== String(id); }); el._count = Math.max(0, (el._count || 1) - 1); }
        layoutStickies(el);
      }, function () {});
  }
  function initStickies(root) {
    root.querySelectorAll('.stickies').forEach(function (el) {
      if (el.getAttribute('data-ready')) return; el.setAttribute('data-ready', '1');
      newPaper(el);
      var api = stickyApi(el), mine = myStickies(el);
      var statuses = mine.length ? fetch(api + '/mine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: mine.map(function (m) { return { id: m.id, token: m.token }; }) }) })
        .then(function (r) { return r.ok ? r.json() : { items: [] }; }).catch(function () { return { items: [] }; }) : Promise.resolve({ items: [] });
      // Load the handwriting before laying out, so each sticky's text is measured in the real font:
      // measured in the fallback, which is wider, long stickies were shrunk and stretched needlessly.
      var hand = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('400 1rem "Caveat"'), document.fonts.load('600 1rem "Caveat"')]).catch(function () {}) : Promise.resolve();
      Promise.all([fetch(api).then(function (r) { if (!r.ok) throw r; return r.json(); }), statuses, hand]).then(function (out) {
        el._stickies = out[0].stickies || []; el._count = out[0].count || 0;
        var st = {}; (out[1].items || []).forEach(function (i) { st[i.id] = i.status; });
        saveMyStickies(el, mine.filter(function (m) { return st[m.id] === 'pending' || st[m.id] === 'approved' || st[m.id] === undefined; })
          .map(function (m) { if (st[m.id]) m.status = st[m.id]; return m; }));
        el.hidden = false; layoutStickies(el); // only shown once the Worker answers
      }).catch(function () {});
      var resizeT; window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (!el.hidden) layoutStickies(el); }, 200); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!el.hidden) layoutStickies(el); });
    });
  }
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('.stickies'); if (!el) return;
    var rm = ev.target.closest('.sticky-remove');
    if (rm) { ev.stopPropagation(); takeBackSticky(el, rm.getAttribute('data-id') || rm.closest('.sticky').getAttribute('data-id')); return; }
    if (ev.target.closest('.stickies-throw')) { throwComposer(el); return; }
    var tog = ev.target.closest('.stickies-toggle');
    if (tog) {
      var on = el.classList.toggle('is-list'); el.querySelector('.stickies-list').hidden = !on;
      tog.setAttribute('aria-pressed', String(on)); var lbl = tog.getAttribute(on ? 'data-pile' : 'data-list'); tog.setAttribute('aria-label', lbl); tog.title = lbl;
      if (!on) layoutStickies(el);
      return;
    }
    var n = ev.target.closest('.sticky'); if (n) sendStickyBack(el, n);
  });
  document.addEventListener('keydown', function (ev) {
    var compose = ev.target.closest && ev.target.closest('.stickies-compose');
    if (compose && ev.key === 'Escape' && !compose.closest('dialog')) { // in the overlay, its cancel handler does this
      var hasText = compose.querySelector('textarea').value || compose.querySelector('input').value;
      if (hasText) { ev.preventDefault(); clearComposer(compose.closest('.stickies')); return; }
    }
    var n = ev.target.closest && ev.target.closest('.sticky');
    if (n && ev.target === n && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); sendStickyBack(n.closest('.stickies'), n); }
  });
  document.addEventListener('submit', function (ev) {
    var form = ev.target.closest && ev.target.closest('.stickies-compose'); if (!form) return;
    ev.preventDefault(); pinSticky(form.closest('.stickies'));
  });
  document.addEventListener('focusin', function (ev) {
    var compose = ev.target.closest && ev.target.closest('.stickies-compose');
    if (compose && !ev.target.matches('.stickies-throw')) startSpamCheck(compose.closest('.stickies'));
  });
  document.addEventListener('input', function (ev) {
    if (!ev.target.matches || !ev.target.matches('.stickies-compose textarea')) return;
    var left = 200 - [...ev.target.value].length, c = ev.target.closest('.stickies-compose').querySelector('.stickies-left');
    c.textContent = left; c.classList.toggle('is-low', left < 20);
  });
  initStickies(document);

  function closeReader() { if (reader && reader.open) reader.close(); }
  // In the overlay, the browser closes the dialog on Escape by itself. If the blank sticky has writing
  // on it, Escape clears that first and keeps the overlay open; pressed again, it closes as usual.
  if (reader) reader.addEventListener('cancel', function (e) {
    var a = document.activeElement, comp = a && a.closest && a.closest('.stickies-compose');
    if (comp && (comp.querySelector('textarea').value || comp.querySelector('input').value)) { e.preventDefault(); clearComposer(comp.closest('.stickies')); }
  });

  function openPost(url, card) {
    if (card) card.classList.add('is-opening');
    fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var panel = doc.querySelector('.post-panel');
        if (!panel) { location.href = url; return; }
        body.replaceChildren(document.importNode(panel, true));
        var stickiesHere = doc.querySelector('.stickies'); // the stickies come across too, inside the card: one piece
        if (stickiesHere) body.querySelector('.post-panel').appendChild(document.importNode(stickiesHere, true));
        decorate(body);
        initPostActions(body);
        initStamps(body);
        liteYouTube(body);
        document.documentElement.classList.add('reader-open');
        reader.showModal();
        initStickies(body); // after it's open, so the pile can be measured
        reader.scrollTop = 0;
        document.title = doc.title || baseTitle;
        baseUrl = location.href;
        history.pushState({ reader: true }, '', url);
        pushed = true;
      })
      .catch(function () { location.href = url; })
      .finally(function () { if (card) card.classList.remove('is-opening'); });
  }

  if (reader && typeof reader.showModal === 'function' && window.fetch && window.DOMParser) {
    document.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('.card-title a');
      if (!link || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (link.origin !== location.origin) return;
      e.preventDefault();
      openPost(link.href, link.closest('.card'));
    });

    reader.querySelector('.reader-close').addEventListener('click', closeReader);
    // Any click that is not on the story panel itself closes the overlay.
    reader.addEventListener('click', function (e) {
      if (!e.target.closest('.post-panel') && !e.target.closest('.stickies') && !e.target.closest('.reader-close')) closeReader(); // the stickies belong to the post
    });
    reader.addEventListener('close', function () {
      document.documentElement.classList.remove('reader-open');
      document.title = baseTitle;
      body.replaceChildren();
      if (pushed) { pushed = false; history.back(); }
    });
    window.addEventListener('popstate', function (e) {
      if (reader.open) { pushed = false; closeReader(); return; }
      // Going forward into a post that was opened in the overlay: load it properly.
      if (e.state && e.state.reader) location.reload();
    });
  }

  // Now ticker: items separated by "|" in the theme settings.
  var now = document.querySelector('.now');
  if (!now) return;
  var items = (now.getAttribute('data-now') || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
  var track = now.querySelector('.now-track');
  if (!items.length || !track) return;
  var list = document.createElement('ul');
  list.className = 'now-list';
  items.forEach(function (text) {
    var li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  });
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  track.innerHTML = '';
  track.appendChild(list);
  if (!reduce && items.length > 1) {
    var copy = list.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    track.appendChild(copy);
    track.classList.add('now-track--moving');
  }
})();
