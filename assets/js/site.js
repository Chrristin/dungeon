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
  // box (optional): { target, W, H, kind, key } draws the pattern into any element, e.g. an image-less card's image spot
  function drawFlora(card, box) {
    var old = (box ? box.target : card).querySelector('.now-flora');
    if (old) old.remove();
    var W, H, padL = 0, padB = 0, kind, seed = 0, key;
    if (box) { W = box.W; H = box.H; kind = box.kind; key = box.key; }
    else {
    if (stacked.matches) return;
    var body = card.querySelector('.now-body');
    if (!body) return;
    // Measure in the card's own (un-tilted) frame: on-screen boxes of tilted cards are inflated
    padL = px(card, 'paddingLeft'); var padR = px(card, 'paddingRight'); padB = px(card, 'paddingBottom');
    var textBottom = 0;
    [].forEach.call(card.children, function (el) { if (el.classList.contains('now-flora')) return; textBottom = Math.max(textBottom, el.offsetTop + el.offsetHeight); });
    W = Math.round(card.clientWidth - padL - padR); H = Math.round(card.clientHeight - textBottom - padB - 16);
    // The pattern's structure comes only from the seed; the size just scales positions,
    // so a 1px difference between loads can't add or remove anything.
    if (W < 80 || H < 70) return;
    // Which pattern: a month's #filler-… tag wins, otherwise the theme setting
    var SETTING = { 'floral': 'floral', 'circuit board': 'circuit', 'cityscape': 'city', 'topographic': 'topo', 'none': 'none' };
    var timeline = card.closest('.now-timeline');
    kind = card.getAttribute('data-filler') || SETTING[((timeline && timeline.getAttribute('data-filler')) || 'floral').toLowerCase()] || 'floral';
    if (kind === 'none') return;
    key = card.getAttribute('data-key') || card.getAttribute('data-month') || 'now';
    }
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
    if (!box) { svg.style.left = padL + 'px'; svg.style.bottom = padB + 'px'; }
    svg.innerHTML = parts.join('');
    (box ? box.target : card).appendChild(svg);
  }
  // Older and Newer cards without an image: the image spot gets one of the etched patterns, by post
  function fillCards(root) {
    root.querySelectorAll('.card-fill').forEach(function (f) {
      var key = f.getAttribute('data-key') || 'post', h = 0;
      for (var i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 2654435761) >>> 0;
      var W = Math.round(f.clientWidth), H = Math.round(f.clientHeight);
      if (W > 40 && H > 40) drawFlora(null, { target: f, W: W, H: H, kind: ['floral', 'circuit', 'city', 'topo'][h % 4], key: key });
    });
  }
  fillCards(document);
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
  // Sticky papers: 0-5 pastel (yellow, pink, mint, sky, lilac, peach), 6-11 bold (red, tangerine, sunflower,
  // cobalt, emerald, ink). Stickies avoid the paper closest to the post's own colour.
  var NEAR = { '0': [2], '1': [2], '2': [3], '3': [3], '4': [4], '5': [1], '6': [5], '7': [0], '8': [2], '9': [2],
    red: [6, 1], tangerine: [7, 5], sunflower: [8, 0], cobalt: [9, 3], emerald: [10, 2], ink: [11] };
  var DARK_PAPER = { '6': 1, '9': 1, '10': 1, '11': 1 };
  var avoidFor = function (el) { var panel = el.closest('.post-panel') || document.querySelector('.post-panel'); return NEAR[(panel && panel.getAttribute('data-hue')) || ''] || []; };
  var paperOf = function (s, el) {
    var c = s.colour === 0 || s.colour > 0 ? Number(s.colour) : Math.abs(Number(s.id)) % 6, avoid = el ? avoidFor(el) : [];
    for (var step = 0; step < 6 && avoid.indexOf(c) >= 0; step++) c = c < 6 ? (c + 1) % 6 : 6 + (c - 5) % 6; // the next paper in the same family
    return String(c);
  };
  var stickyDate = function (iso) { var d = new Date(iso); if (isNaN(d)) d = new Date(); return String(d.getUTCDate()).padStart(2, '0') + ' ' + MONTHS[d.getUTCMonth()]; };
  // Seeded randomness. The seed is scrambled first: consecutive sticky numbers otherwise start out with
  // near-identical values, so neighbours picked the same tape (or doodle) far too often.
  function seeded(seed) { seed = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b); seed ^= seed >>> 13; seed = Math.imul(seed, 0xc2b2ae35); seed ^= seed >>> 16; return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

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
    n.setAttribute('data-id', s.id); n.setAttribute('data-c', paperOf(s, el));
    var paper = document.createElement('div'); paper.className = 'sticky-paper'; paper.style.setProperty('--fray', frayClip(s.id));
    if (waiting) { var w = document.createElement('span'); w.className = 'sticky-waiting'; w.textContent = el.getAttribute('data-waiting'); paper.appendChild(w); }
    var p = document.createElement('p'); p.className = 'sticky-text'; p.textContent = s.body; paper.appendChild(p);
    var foot = document.createElement('div'); foot.className = 'sticky-foot';
    var by = document.createElement('span'); by.className = 'sticky-by'; by.textContent = s.name || (s.role === 'member' ? el.getAttribute('data-a-member') : ''); foot.appendChild(by);
    if (s.role) { var role = document.createElement('span'); role.className = 'sticky-role sticky-role--' + s.role; role.textContent = el.getAttribute(s.role === 'author' ? 'data-author-label' : 'data-member-label'); foot.appendChild(role); }
    if (isOwn(el, s.id)) { var x = document.createElement('button'); x.type = 'button'; x.className = 'sticky-remove'; x.innerHTML = '&times;'; x.setAttribute('aria-label', el.getAttribute('data-remove')); foot.appendChild(x); }
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
  // Hand-drawn look: each stroke is redrawn as a slightly wavering line with a little shake, and open
  // lines can overshoot. Baked into the shape when drawn, so it costs nothing while scrolling.
  var NS = 'http://www.w3.org/2000/svg', ruler = null;
  function wobbly(d, rand, amt) {
    if (!ruler) { ruler = document.createElementNS(NS, 'svg'); ruler.setAttribute('width', '0'); ruler.setAttribute('height', '0'); ruler.setAttribute('aria-hidden', 'true'); ruler.style.position = 'absolute'; ruler.style.visibility = 'hidden'; document.body.appendChild(ruler); }
    var out = [];
    d.split(/(?=M)/).forEach(function (sub) {
      if (!sub.trim()) return;
      var p = document.createElementNS(NS, 'path'); p.setAttribute('d', sub); ruler.appendChild(p);
      var L = 0; try { L = p.getTotalLength(); } catch (e) {}
      if (L < 0.5) { ruler.removeChild(p); out.push(sub); return; } // a dot stays a dot
      var steps = Math.max(5, Math.round(L / 2.2)), ph = rand() * 6.28, ph2 = rand() * 6.28, fr = 0.18 + rand() * 0.22, pts = [];
      for (var i = 0; i <= steps; i++) {
        var pt = p.getPointAtLength(L * i / steps);
        pts.push([pt.x + Math.sin(i * fr + ph) * amt + (rand() - 0.5) * amt * 0.5, pt.y + Math.cos(i * fr * 1.3 + ph2) * amt + (rand() - 0.5) * amt * 0.5]);
      }
      ruler.removeChild(p);
      var a0 = pts[0], z = pts[pts.length - 1], b0 = pts[pts.length - 2];
      if (Math.hypot(a0[0] - z[0], a0[1] - z[1]) > 2 && rand() < 0.5) { var o = 1 + rand() * 2.2, dx = z[0] - b0[0], dy = z[1] - b0[1], dl = Math.hypot(dx, dy) || 1; pts.push([z[0] + dx / dl * o, z[1] + dy / dl * o]); } // overshoot
      out.push('M' + pts.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L'));
    });
    return out.join('');
  }
  // Scribbles that sit around a main doodle: squiggles, arrows, dots, hatching, swooshes
  var SCRIBBLES = [
    function (r) { var s = 'M6 24'; for (var x = 9; x <= 42; x += 3) s += 'L' + x + ' ' + (24 + Math.sin(x * 0.55 + r() * 2) * 6).toFixed(1); return s; },
    function (r) { return 'M8 34C16 30 24 18 36 14M36 14l-7 1M36 14l-1.5 7'; },
    function (r) { var s = ''; for (var k = 0; k < 4 + Math.floor(r() * 3); k++) s += 'M' + (10 + r() * 28).toFixed(0) + ' ' + (10 + r() * 28).toFixed(0) + 'h.01'; return s; },
    function (r) { var s = ''; for (var k = 0; k < 5; k++) s += 'M' + (10 + k * 5) + ' 34L' + (18 + k * 5) + ' 14'; return s; },
    function (r) { return 'M6 30c9 -7 27 -7 36 -1'; },
    function (r) { return 'M24 24c0-2 3-2 3 0 0 4-6 4-6 0 0-6 9-6 9 0 0 8-12 8-12 0'; },
    function (r) { return 'M10 18l4 4M14 18l-4 4M30 12l4 4M34 12l-4 4M22 32l4 4M26 32l-4 4'; }
  ];
  // Several doodles per sticky, where the text leaves room: one main doodle (by topic) and a few scribbles,
  // scattered at different sizes and tilts, never on each other, the writing or the name. One pen per sticky.
  // Members' stickies get a hand-drawn frame just inside the paper's edge; the author's, a double one.
  // Same pen as the sticky's doodles, wobbly like them.
  function addBorder(el, n, s) {
    if (s.role !== 'member' && s.role !== 'author') return;
    var paper = n.querySelector('.sticky-paper'), W = paper.clientWidth, H = paper.clientHeight; if (!W || !H) return;
    var rand = seeded(Math.abs(Number(s.id)) * 97 + 3), ink = DARK_PAPER[n.getAttribute('data-c')] ? 'rgba(251, 245, 232, 0.6)' : 'rgba(35, 37, 43, 0.5)';
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'sticky-border'); svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.style.stroke = ink;
    var frame = function (inset, amt, width) {
      var i = inset, pth = document.createElementNS(NS, 'path');
      pth.setAttribute('d', wobbly('M' + (i + 3) + ' ' + i + 'H' + (W - i) + 'V' + (H - i) + 'H' + i + 'V' + (i + 2), rand, amt)); // not quite closed, like a hand-drawn box
      pth.style.strokeWidth = width; svg.appendChild(pth);
    };
    frame(6 + rand() * 1.5, 1.1, (1.2 + rand() * 0.4).toFixed(2));
    if (s.role === 'author') frame(10 + rand() * 1.5, 1.3, (0.9 + rand() * 0.3).toFixed(2)); // yours: a double frame
    paper.appendChild(svg);
  }
  function addDoodle(el, n, s) {
    var p = n.querySelector('.sticky-text'), paper = n.querySelector('.sticky-paper');
    if (!p || n.style.height) return;
    var box = p.clientHeight; p.style.flex = 'none'; var used = p.offsetHeight; p.style.flex = '';
    var free = box - used; if (free < box * 0.35) return;
    var rand = seeded(Math.abs(Number(s.id)) * 31 + 5), set = doodleSet(el);
    var region = { x: paper.clientWidth * 0.06, y: p.offsetTop + used + 6, w: paper.clientWidth * 0.88, h: free - 8 };
    var main = Math.min(region.h / 1.25, region.w * 0.42, 58); if (main < 22) return;
    var pen = rand(), ink = DARK_PAPER[n.getAttribute('data-c')] ? 'rgba(251, 245, 232, 0.55)' : pen < 0.12 ? 'rgba(38, 72, 170, 0.62)' : pen < 0.2 ? 'rgba(182, 38, 52, 0.55)' : 'rgba(35, 37, 43, 0.46)';
    var list = [{ d: set[Math.floor(rand() * set.length)], size: main }];
    var extra = Math.min(3, Math.floor(region.w * region.h / (main * main * 1.9)));
    for (var k = 0; k < extra; k++) list.push({ d: rand() < 0.7 ? SCRIBBLES[Math.floor(rand() * SCRIBBLES.length)](rand) : DOODLES.any[Math.floor(rand() * DOODLES.any.length)], size: main * (0.34 + rand() * 0.3) });
    var placed = [];
    list.forEach(function (item) {
      var t = item.size * 1.25, spot = null; // room for it tilted
      for (var tries = 0; tries < 30 && !spot; tries++) {
        var x = region.x + rand() * Math.max(0, region.w - t), y = region.y + rand() * Math.max(0, region.h - t);
        if (!placed.some(function (q) { return x < q.x + q.t + 4 && x + t + 4 > q.x && y < q.y + q.t + 4 && y + t + 4 > q.y; })) spot = { x: x, y: y, t: t };
      }
      if (!spot) return;
      placed.push(spot);
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 48 48'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'sticky-doodle');
      svg.style.width = item.size + 'px'; svg.style.height = item.size + 'px';
      svg.style.left = (spot.x + (t - item.size) / 2) + 'px'; svg.style.top = (spot.y + (t - item.size) / 2) + 'px';
      svg.style.transform = 'rotate(' + ((rand() - 0.5) * 40).toFixed(1) + 'deg)'; svg.style.stroke = ink;
      var w = (1.2 + rand() * 0.8).toFixed(2), path = document.createElementNS(NS, 'path');
      path.setAttribute('d', wobbly(item.d, rand, 0.9)); path.style.strokeWidth = w; svg.appendChild(path);
      if (rand() < 0.22) { var again = document.createElementNS(NS, 'path'); again.setAttribute('d', wobbly(item.d, rand, 1.3)); again.style.strokeWidth = (w * 0.7).toFixed(2); again.style.opacity = '0.6'; svg.appendChild(again); } // gone over twice
      paper.appendChild(svg);
    });
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
    el._focus = null; el._moving = 0; el.classList.remove('has-focus');
    var board = el.querySelector('.stickies-board'), list = el.querySelector('.stickies-list');
    var approved = (el._stickies || []).slice(), mine = myStickies(el).filter(function (m) { return m.status === 'pending'; });
    var shownIds = {}; approved.forEach(function (s) { shownIds[s.id] = true; });
    mine = mine.filter(function (m) { return !shownIds[m.id]; });
    board.textContent = ''; list.textContent = '';
    var all = approved.slice().reverse().map(function (s) { return { s: s, waiting: false }; }).concat(mine.map(function (m) { return { s: m, waiting: true }; }));
    el.classList.toggle('is-empty', !all.length);
    if (!all.length) return;
    all.slice().reverse().forEach(function (item) { // the list: newest first
      var d = document.createElement('div'); d.setAttribute('role', 'listitem'); d.setAttribute('data-c', paperOf(item.s, el));
      d.style.setProperty('--fray', frayClip(item.s.id));
      if (item.waiting) d.className = 'is-waiting';
      d.appendChild(document.createTextNode(item.s.body));
      var meta = document.createElement('span');
      meta.textContent = (item.s.name || el.getAttribute(item.s.role === 'member' ? 'data-a-member' : 'data-anonymous')) + (item.s.role ? ' · ' + el.getAttribute(item.s.role === 'author' ? 'data-author-label' : 'data-member-label') : '') + ' · ' + stickyDate(item.s.date || item.s.created) + (item.waiting ? ' · ' + el.getAttribute('data-waiting') : '');
      d.appendChild(meta);
      if (isOwn(el, item.s.id)) { var x = document.createElement('button'); x.type = 'button'; x.className = 'sticky-remove'; x.setAttribute('data-id', item.s.id); x.innerHTML = '&times;'; x.setAttribute('aria-label', el.getAttribute('data-remove')); d.appendChild(x); }
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
      board.appendChild(n); fitSticky(n); addDoodle(el, n, item.s); addBorder(el, n, item.s);
    });
    el._landing = null;
  }
  // Sending a sticky to the back, as one motion: it's pulled out just far enough to clear its neighbours
  // (so passing beneath them never "pops"), slides back underneath, and the neighbours react: nudged
  // aside as it pulls away, lifting a touch to let it under, then settling.
  function listAroundComposer(el) {
    var list = el.querySelector('.stickies-list'), form = el.querySelector('.stickies-compose');
    var old = list.querySelector('.stickies-list-spacer'); if (old) old.remove();
    if (list.hidden || getComputedStyle(form).position !== 'absolute') return;
    var cr = form.getBoundingClientRect(), lr = list.getBoundingClientRect(); if (cr.bottom + 12 <= lr.top) return;
    var cols = getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).map(parseFloat), gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    var x = lr.left, first = 0, last = 0;
    cols.forEach(function (w, i) { if (x < cr.right + 12 && x + w > cr.left - 12) { if (!first) first = i + 1; last = i + 1; } x += w + gap; });
    if (!first) return;
    var sp = document.createElement('div'); sp.className = 'stickies-list-spacer'; sp.setAttribute('aria-hidden', 'true');
    sp.style.gridColumn = first + ' / ' + (last + 1);
    list.insertBefore(sp, list.firstChild);
    var items = [].filter.call(list.children, function (d) { return d !== sp; });
    var under = function () { return items.some(function (d) { var r = d.getBoundingClientRect(); return r.left < cr.right + 12 && r.right > cr.left - 12 && r.top < cr.bottom + 12 && r.bottom > cr.top; }); };
    for (var rows = 1; rows <= 40; rows++) { sp.style.gridRow = '1 / span ' + rows; if (!under()) break; } // as many rows as it takes
  }
  // Two steps: tapping a sticky lifts it, larger, towards the middle of the stickies, to read. Escape, a tap
  // anywhere else, or a tap on it sends it back to the bottom of the pile; tapping another sticky sends
  // the first back and lifts the new one.
  function focusSticky(el, n) {
    if (n.getAttribute('data-moving')) return;
    var rot = n.style.getPropertyValue('--rot'), r = n.getBoundingClientRect(), br = el.querySelector('.stickies-board').getBoundingClientRect();
    var w = n.offsetWidth, h = n.offsetHeight, s = Math.max(1, Math.min(1.5, (innerWidth - 32) / w, (innerHeight - 64) / h));
    var tx = Math.max(w * s / 2 + 16, Math.min(innerWidth - w * s / 2 - 16, br.left + br.width / 2));
    var ty = Math.max(h * s / 2 + 32, Math.min(innerHeight - h * s / 2 - 32, br.top + br.height / 2));
    el._focus = n; n.setAttribute('data-focus', '1'); el.classList.add('has-focus');
    n._z = n.style.zIndex; n.style.zIndex = 9999;
    n._lift = n.animate([
      { transform: rot + ' translate(0,0) scale(1)' },
      { transform: 'translate(' + (tx - (r.left + r.width / 2)).toFixed(1) + 'px,' + (ty - (r.top + r.height / 2)).toFixed(1) + 'px) rotate(-0.6deg) scale(' + s.toFixed(3) + ')' }
    ], { duration: 420, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'forwards' });
  }
  function dismissSticky(el, next) {
    var n = el._focus; if (!n) return;
    el._focus = null; n.removeAttribute('data-focus');
    var now = getComputedStyle(n).transform; // where it is, enlarged
    if (n._lift) { n._lift.cancel(); n._lift = null; }
    sendStickyBack(el, n, now); // it stays on top until the moment it goes under
    if (next && next !== n) focusSticky(el, next);
  }
  function tapSticky(el, n) {
    if (el._focus === n) dismissSticky(el);
    else if (el._focus) dismissSticky(el, n);
    else focusSticky(el, n);
  }
  function sendStickyBack(el, n, from) {
    if (n.getAttribute('data-moving')) return;
    var board = el.querySelector('.stickies-board'), notes = [].slice.call(board.children);
    var min = Math.min.apply(null, notes.map(function (x) { return +x.style.zIndex; }));
    var toBack = function () { notes.forEach(function (x) { if (x !== n) x.style.zIndex = +x.style.zIndex + 1; }); n.style.zIndex = min; };
    if (calmStamps || !n.animate) { toBack(); return; }
    n.setAttribute('data-moving', '1');
    var rot = n.style.getPropertyValue('--rot'), r = n.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var hit = function (a, b2, dx, dy) { return a.left + dx < b2.right && a.right + dx > b2.left && a.top + dy < b2.bottom && a.bottom + dy > b2.top; };
    var near = notes.filter(function (x) { return x !== n && hit(r, x.getBoundingClientRect(), 0, 0); });
    var b = board.getBoundingClientRect(), vx = cx - (b.left + b.width / 2), vy = cy - (b.top + b.height / 2), len = Math.hypot(vx, vy) || 1;
    vx /= len; vy /= len;
    var stage = el.querySelector('.stickies-stage').getBoundingClientRect(), m = 6;
    var clampX = function (x) { return Math.max(stage.left + m - r.left, Math.min(stage.right - m - r.right, x)); };
    var clampY = function (y) { return Math.max(stage.top + m - r.top, Math.min(stage.bottom - m - r.bottom, y)); };
    var ox = clampX(vx * 260), oy = clampY(vy * 260); // as far as allowed, unless less is enough:
    for (var d = 40; d <= 260; d += 10) {
      var tx = clampX(vx * d), ty = clampY(vy * d);
      if (!near.some(function (x) { return hit(r, x.getBoundingClientRect(), tx, ty); })) { ox = tx; oy = ty; break; }
    }
    var T = 1050, swap = 0.46;
    el._moving = (el._moving || 0) + 1; // how many stickies are in motion: clipping comes back only when all have settled
    var out = rot + ' translate(' + ox + 'px,' + oy + 'px) scale(1.05)';
    // One continuous motion, and nothing new appears mid-way: at its furthest point the sticky fades a little,
    // goes beneath, and fades back as it slides under. The shadow is left alone throughout.
    var move = n.animate([
      { transform: from && from !== 'none' ? from : rot + ' translate(0,0) scale(1)', opacity: 1, offset: 0, easing: 'cubic-bezier(.25,.8,.35,1)' },
      { transform: rot + ' translate(' + (ox * 0.96).toFixed(1) + 'px,' + (oy * 0.96).toFixed(1) + 'px) scale(1.05)', opacity: 1, offset: swap - 0.08 },
      { transform: out, opacity: 0.35, offset: swap, easing: 'cubic-bezier(.45,0,.3,1)' },
      { transform: rot + ' translate(' + (ox * 0.7).toFixed(1) + 'px,' + (oy * 0.7).toFixed(1) + 'px) scale(1.04)', opacity: 1, offset: swap + 0.2 },
      { transform: rot + ' translate(0,0) scale(1)', opacity: 1, offset: 1 }
    ], { duration: T, fill: 'forwards' });
    setTimeout(toBack, T * swap); // beneath the others at its furthest point, while faded
    near.forEach(function (x) { // the neighbours react
      var xr = x.getBoundingClientRect(), ax = (xr.left + xr.width / 2) - cx, ay = (xr.top + xr.height / 2) - cy, al = Math.hypot(ax, ay) || 1;
      var px = (ax / al * 5).toFixed(1), py = (ay / al * 5).toFixed(1), tilt = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.8);
      x.animate([
        { translate: '0 0', rotate: '0deg', scale: '1' },
        { translate: px + 'px ' + py + 'px', rotate: tilt + 'deg', scale: '1', offset: 0.22 },
        { translate: (px / 2) + 'px ' + (py / 2) + 'px', rotate: (tilt / 2) + 'deg', scale: '1', offset: 0.45 },
        { translate: '0 -3px', rotate: '0deg', scale: '1.015', offset: 0.72 },
        { translate: '0 0', rotate: '0deg', scale: '1' }
      ], { duration: T, easing: 'ease-in-out' });
    });
    move.onfinish = function () {
      move.cancel(); n.style.transform = rot; n.style.filter = ''; n.removeAttribute('data-moving');
      el._moving = Math.max(0, (el._moving || 1) - 1);
      if (!el._focus && !el._moving) el.classList.remove('has-focus'); // only once every sticky has settled
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
    var form = el.querySelector('.stickies-compose'), prev = form.getAttribute('data-c'), avoid = avoidFor(el), c;
    do { c = String(Math.random() < 0.25 ? 6 + Math.floor(Math.random() * 6) : Math.floor(Math.random() * 6)); } while (c === prev || avoid.indexOf(Number(c)) >= 0); // 1 in 4 bold
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
    // The sheet is cut into 16 irregular pieces sharing their corners (so it starts as one flat sticky).
    // Crumpling folds each piece in towards the middle, tipped at its own angle so it catches the light
    // differently; a darker core shows through the gaps like crevices, and a couple of corners stay out
    // like curled edges. Then the ball is thrown off the page.
    var ball = document.createElement('div'), c = form.getAttribute('data-c');
    ball.className = 'sticky-ball'; ball.style.setProperty('--deep', getComputedStyle(form).getPropertyValue('--deep') || '#b08a00');
    ball.style.left = r.left + 'px'; ball.style.top = r.top + 'px'; ball.style.width = r.width + 'px'; ball.style.height = r.height + 'px';
    var core = document.createElement('div'); core.className = 'sticky-ball-core'; core.setAttribute('data-c', c);
    var blob = [];
    for (var q = 0; q < 14; q++) { var aa = q / 14 * Math.PI * 2, rr = 22 + Math.random() * 7; blob.push((50 + Math.cos(aa) * rr).toFixed(1) + '% ' + (50 + Math.sin(aa) * rr * 0.95).toFixed(1) + '%'); }
    core.style.clipPath = 'polygon(' + blob.join(',') + ')';
    ball.appendChild(core);
    var G = 4, P = [];
    for (var i = 0; i <= G; i++) { P[i] = []; for (var jj = 0; jj <= G; jj++) {
      var x = i * 100 / G, y = jj * 100 / G, inner = i > 0 && i < G && jj > 0 && jj < G;
      P[i][jj] = [x + (inner ? (Math.random() - 0.5) * 14 : 0), y + (inner ? (Math.random() - 0.5) * 14 : 0)];
    } }
    var pieces = [], corners = [[0, 0], [G - 1, 0], [0, G - 1], [G - 1, G - 1]].sort(function () { return Math.random() - 0.5; }).slice(0, 2);
    for (i = 0; i < G; i++) for (jj = 0; jj < G; jj++) {
      var poly = [P[i][jj], P[i + 1][jj], P[i + 1][jj + 1], P[i][jj + 1]];
      var cx = (poly[0][0] + poly[1][0] + poly[2][0] + poly[3][0]) / 4, cy = (poly[0][1] + poly[1][1] + poly[2][1] + poly[3][1]) / 4;
      var curl = corners.some(function (k) { return k[0] === i && k[1] === jj; });
      var pc = document.createElement('div'); pc.className = 'sticky-ball-piece'; pc.setAttribute('data-c', c);
      pc.style.clipPath = 'polygon(' + poly.map(function (v) { return (cx + (v[0] - cx) * 1.05).toFixed(1) + '% ' + (cy + (v[1] - cy) * 1.05).toFixed(1) + '%'; }).join(',') + ')'; // overlap a touch: no seams
      pc.style.transformOrigin = cx.toFixed(1) + '% ' + cy.toFixed(1) + '%';
      var light = document.createElement('div'); light.className = 'sticky-ball-light';
      var lit = Math.random(); light.style.background = 'linear-gradient(' + Math.round(Math.random() * 360) + 'deg, rgba(255,255,255,' + (0.15 + lit * 0.45).toFixed(2) + '), color-mix(in srgb, var(--deep) ' + Math.round(14 + (1 - lit) * 34) + '%, transparent))'; // shade in a deeper version of its own colour
      pc.appendChild(light); ball.appendChild(pc);
      var pull = curl ? 0.44 + Math.random() * 0.08 : 0.62 + Math.random() * 0.12;
      pieces.push({ el: pc, light: light, tx: (50 - cx) / 100 * r.width * pull, ty: (50 - cy) / 100 * r.height * pull,
        rz: (Math.random() - 0.5) * (curl ? 80 : 60), ax: (Math.random() - 0.5).toFixed(2), ay: (Math.random() - 0.5).toFixed(2),
        a3: (curl ? 45 : 22) + Math.random() * 32, s: curl ? 0.86 : 0.74 + Math.random() * 0.12, b: (0.9 + Math.random() * 0.2).toFixed(2), z: Math.floor(Math.random() * 20) + (curl ? 20 : 1) });
    }
    (form.closest('dialog') || document.body).appendChild(ball); // inside the overlay when thrown from there
    form.style.visibility = 'hidden';
    var CR = 440;
    pieces.forEach(function (p) {
      p.el.style.zIndex = p.z;
      p.el.animate([
        { transform: 'none', filter: 'brightness(1)' },
        { transform: 'translate(' + (p.tx * 0.45).toFixed(1) + 'px,' + (p.ty * 0.45).toFixed(1) + 'px) rotate(' + (p.rz * 0.4).toFixed(1) + 'deg) rotate3d(' + p.ax + ',' + p.ay + ',0,' + (p.a3 * 0.5).toFixed(0) + 'deg) scale(' + ((1 + p.s) / 2).toFixed(2) + ')', filter: 'brightness(' + ((1 + +p.b) / 2).toFixed(2) + ')', offset: 0.45 },
        { transform: 'translate(' + p.tx.toFixed(1) + 'px,' + p.ty.toFixed(1) + 'px) rotate(' + p.rz.toFixed(1) + 'deg) rotate3d(' + p.ax + ',' + p.ay + ',0,' + p.a3.toFixed(0) + 'deg) scale(' + p.s + ')', filter: 'brightness(' + p.b + ')' }
      ], { duration: CR, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'forwards' });
      p.light.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CR, fill: 'forwards' });
    });
    core.animate([{ opacity: 0, transform: 'scale(1.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: CR, fill: 'forwards' });
    var a = Math.random() * Math.PI * 2, reach = Math.max(innerWidth, innerHeight) * 0.9, dx = Math.cos(a) * reach, dy = Math.sin(a) * reach;
    var spin = (Math.random() < 0.5 ? -1 : 1) * (420 + Math.random() * 300), T = 1350, k0 = CR / T;
    var fly = ball.animate([
      { transform: 'rotate(-3deg) scale(1)' },
      { transform: 'rotate(8deg) scale(0.92)', offset: k0 * 0.6 },
      { transform: 'rotate(12deg) scale(0.86)', offset: k0 },
      { transform: 'translate(' + (dx * 0.4) + 'px,' + (dy * 0.4 - 90) + 'px) rotate(' + (spin * 0.5) + 'deg) scale(0.62)', offset: 0.68 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + spin + 'deg) scale(0.5)' }
    ], { duration: T, easing: 'cubic-bezier(.3,.55,.45,1)', fill: 'forwards' });
    setTimeout(function () { form.style.visibility = ''; restick(el); }, CR);
    fly.onfinish = function () { ball.remove(); };
  }
  function waitForToken(el, ms) {
    return new Promise(function (res) { var t0 = Date.now(); (function poll() { if (el._ts || Date.now() - t0 > ms) res(el._ts || null); else setTimeout(poll, 200); })(); });
  }
  var isMember = function (el) { return el.getAttribute('data-member') === '1'; };
  function memberPass() { // a short-lived signed pass from Ghost, proving who the signed-in member is
    return fetch('/members/api/session', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) { t = (t || '').trim(); return t.split('.').length === 3 ? t : ''; }).catch(function () { return ''; });
  }
  var isOwn = function (el, id) { return pinnedNow(id) || (el._own || []).indexOf(Number(id)) >= 0; };
  function pinSticky(el) {
    var form = el.querySelector('.stickies-compose'), text = form.querySelector('textarea'), nameIn = form.querySelector('input'), msg = form.querySelector('.stickies-msg'), btn = form.querySelector('.stickies-pin');
    var body = text.value.trim();
    if (!body) { msg.textContent = el.getAttribute('data-err-empty'); msg.classList.add('is-hand'); text.focus(); return; }
    msg.classList.remove('is-hand');
    btn.disabled = true;
    var name = isMember(el) ? (el.getAttribute('data-member-name') || '') : nameIn.value.trim();
    (isMember(el) ? memberPass() : Promise.resolve('')).then(function (pass) {
      if (!pass) { msg.textContent = el._ts ? '' : el.getAttribute('data-checking'); startSpamCheck(el); } // a visitor, or a member whose pass didn't come
      return (pass ? Promise.resolve(null) : waitForToken(el, 10000)).then(function (token) {
        var h = { 'Content-Type': 'application/json' }; if (pass) h.Authorization = 'GhostMember ' + pass;
        return fetch(stickyApi(el), { method: 'POST', headers: h, body: JSON.stringify({ body: body, name: name, colour: Number(form.getAttribute('data-c')), turnstile: token }) })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; }); });
      });
    }).then(function (res) {
      btn.disabled = false; el._ts = null;
      if (el._widget !== null && el._widget !== undefined && window.turnstile) { try { window.turnstile.reset(el._widget); } catch (e) {} }
      if (!res.ok) {
        var e = (res.d && res.d.error) || '';
        msg.textContent = res.status === 429 ? el.getAttribute('data-err-slow') : /spam/.test(e) ? el.getAttribute('data-err-spam') : /name/.test(e) ? el.getAttribute('data-err-name') : el.getAttribute('data-err-other');
        return;
      }
      var entry = { id: res.d.id, token: res.d.token, body: body, name: name || null, colour: Number(form.getAttribute('data-c')), created: new Date().toISOString(), status: res.d.status || 'pending', role: res.d.role || null };
      var mine = myStickies(el); mine.push(entry); saveMyStickies(el, mine);
      if (entry.status === 'approved') { // a member's goes straight up
        el._stickies = [{ id: entry.id, date: entry.created.slice(0, 10), body: body, name: entry.name, colour: entry.colour, role: entry.role }].concat(el._stickies || []);
        el._count = (el._count || 0) + 1; el._own = (el._own || []).concat([entry.id]);
      }
      try { sessionStorage.setItem('dungeon-sticky-now:' + res.d.id, '1'); } catch (e2) {}
      clearComposer(el); restick(el); el._landing = res.d.id; layoutStickies(el);
    }, function () { btn.disabled = false; msg.textContent = el.getAttribute('data-err-other'); });
  }
  function takeBackSticky(el, id) {
    var mine = myStickies(el), m = mine.filter(function (x) { return String(x.id) === String(id); })[0];
    var viaPass = isMember(el) && (el._own || []).indexOf(Number(id)) >= 0;
    if (!m && !viaPass) return;
    (viaPass ? memberPass() : Promise.resolve('')).then(function (pass) {
      var h = { 'Content-Type': 'application/json' }; if (pass) h.Authorization = 'GhostMember ' + pass;
      return fetch(stickyApi(el) + '/' + id, { method: 'DELETE', headers: h, body: JSON.stringify({ token: m ? m.token : '' }) });
    }).then(function (r) { if (!r.ok) throw r; }).then(function () {
        saveMyStickies(el, mine.filter(function (x) { return x !== m; }));
        el._own = (el._own || []).filter(function (x) { return String(x) !== String(id); });
        if ((el._stickies || []).some(function (s) { return String(s.id) === String(id); })) { el._stickies = el._stickies.filter(function (s) { return String(s.id) !== String(id); }); el._count = Math.max(0, (el._count || 1) - 1); }
        layoutStickies(el);
      }, function () {});
  }
  function initStickies(root) {
    root.querySelectorAll('.stickies').forEach(function (el) {
      if (el.getAttribute('data-ready')) return; el.setAttribute('data-ready', '1');
      newPaper(el);
      var api = stickyApi(el), mine = myStickies(el);
      var statuses = (mine.length || isMember(el)) ? (isMember(el) ? memberPass() : Promise.resolve('')).then(function (pass) {
        var h = { 'Content-Type': 'application/json' }; if (pass) h.Authorization = 'GhostMember ' + pass;
        return fetch(api + '/mine', { method: 'POST', headers: h, body: JSON.stringify({ items: mine.map(function (m) { return { id: m.id, token: m.token }; }) }) });
      }).then(function (r) { return r.ok ? r.json() : { items: [] }; }).catch(function () { return { items: [] }; }) : Promise.resolve({ items: [] });
      // Load the handwriting before laying out, so each sticky's text is measured in the real font:
      // measured in the fallback, which is wider, long stickies were shrunk and stretched needlessly.
      var hand = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('400 1rem "Caveat"'), document.fonts.load('600 1rem "Caveat"')]).catch(function () {}) : Promise.resolve();
      Promise.all([fetch(api).then(function (r) { if (!r.ok) throw r; return r.json(); }), statuses, hand]).then(function (out) {
        el._stickies = out[0].stickies || []; el._count = out[0].count || 0;
        var st = {}; (out[1].items || []).forEach(function (i) { st[i.id] = i.status; });
        el._own = out[1].own || []; // a signed-in member's own stickies, wherever they were written
        saveMyStickies(el, mine.filter(function (m) { return st[m.id] === 'pending' || st[m.id] === 'approved' || st[m.id] === undefined; })
          .map(function (m) { if (st[m.id]) m.status = st[m.id]; return m; }));
        el.hidden = false; layoutStickies(el); // only shown once the Worker answers
      }).catch(function () {});
      var resizeT; window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (!el.hidden) { layoutStickies(el); listAroundComposer(el); } }, 200); });
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
      if (!on) layoutStickies(el); else listAroundComposer(el);
      return;
    }
    var n = ev.target.closest('.sticky'); if (n && n.getAttribute('aria-hidden') !== 'true') tapSticky(el, n);
  });
  document.addEventListener('click', function (ev) { // a tap anywhere else puts a lifted sticky back
    [].forEach.call(document.querySelectorAll('.stickies'), function (s) {
      if (s._focus && !(s.contains(ev.target) && ev.target.closest('.sticky'))) dismissSticky(s);
    });
  });
  document.addEventListener('keydown', function (ev) {
    var compose = ev.target.closest && ev.target.closest('.stickies-compose');
    if (ev.key === 'Escape' && !document.querySelector('.reader[open]')) { // a lifted sticky goes back first
      var lifted = [].filter.call(document.querySelectorAll('.stickies'), function (s) { return s._focus; });
      if (lifted.length) { ev.preventDefault(); lifted.forEach(function (s) { dismissSticky(s); }); return; }
    }
    if (ev.key === 'Escape' && !document.querySelector('.reader[open]')) { // on the page (the overlay's cancel handler does its own)
      var pageSticky = document.querySelector('.stickies:not([hidden]) .stickies-compose');
      var busyElsewhere = ev.target.closest && !ev.target.closest('.stickies-compose') && /^(input|textarea|select)$/i.test(ev.target.tagName || '');
      if (pageSticky && !busyElsewhere) {
        var pr = pageSticky.getBoundingClientRect();
        if (pr.bottom > 0 && pr.top < innerHeight && pr.right > 0 && pr.left < innerWidth) { ev.preventDefault(); throwComposer(pageSticky.closest('.stickies')); return; }
      }
    }
    var n = ev.target.closest && ev.target.closest('.sticky');
    if (n && ev.target === n && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); tapSticky(n.closest('.stickies'), n); }
  });
  document.addEventListener('submit', function (ev) {
    var form = ev.target.closest && ev.target.closest('.stickies-compose'); if (!form) return;
    ev.preventDefault(); pinSticky(form.closest('.stickies'));
  });
  document.addEventListener('focusin', function (ev) {
    var compose = ev.target.closest && ev.target.closest('.stickies-compose');
    if (compose && !ev.target.matches('.stickies-throw') && !isMember(compose.closest('.stickies'))) startSpamCheck(compose.closest('.stickies'));
  });
  document.addEventListener('input', function (ev) {
    if (!ev.target.matches || !ev.target.matches('.stickies-compose textarea')) return;
    var hand = ev.target.closest('.stickies-compose').querySelector('.stickies-msg.is-hand'); // "write something first" goes once you do
    if (hand) { hand.textContent = ''; hand.classList.remove('is-hand'); }
    var left = 200 - [...ev.target.value].length, c = ev.target.closest('.stickies-compose').querySelector('.stickies-left');
    c.textContent = left; c.classList.toggle('is-low', left < 20);
  });
  initStickies(document);

  // ---------------------------------------------------------------- the garden
  // Garden notes are written in Obsidian and published by garden-sync (extras/garden-sync). Each note carries
  // its stage, "last tended" date and backlinks in its header data; the Garden page carries the whole map.
  var SPROUT = {
    seedling: 'M12 20.5c-3.2 0-5.3-1.5-5.3-3.6s2.3-3.5 5.3-3.5 5.2 1.4 5.2 3.4-2 3.7-5.2 3.7zM12.2 13.4c-.2-2.3.6-4.1 2.3-5.1',
    growing: 'M12 21.2V9.4M12 13.6c-3.6.1-5.8-2-5.7-4.9 3.4-.1 5.7 1.9 5.7 4.9zM12.1 10.6c-.1-3.1 2-5.2 5.6-5.3.1 3.3-2.1 5.3-5.6 5.3z',
    evergreen: 'M12 21.3v-4.2M11.9 2.8l5.2 7.1h-3.1l4.2 6.3H5.9l4.1-6.2H6.9z'
  };
  var sprout = function (stage) { return '<svg class="garden-sprout" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (SPROUT[stage] || SPROUT.seedling) + '"/></svg>'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var gardenDay = function (iso) { var d = new Date(iso); return isNaN(d) ? '' : String(d.getUTCDate()).padStart(2, '0') + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
  var readJson = function (node) { try { return node ? JSON.parse(node.textContent) : null; } catch (e) { return null; } };

  // a garden note's page (or the same note in the reader overlay): stage, TENDED stamp, source label, backlinks
  var STAGE_BG = { seedling: '#eef9d6', growing: '#d5f5e6', evergreen: '#1f6b4f' };
  var CONF = { certain: 4, likely: 3, speculative: 2, hunch: 1 };
  // a small map of one note's neighbours: links out and in as vines, related notes dotted; each a tiny card
  function localMap(meta, L) {
    var nb = [], seen = {};
    var add = function (x, kind) { if (!x || seen[x.u]) return; seen[x.u] = 1; nb.push({ t: x.t, u: x.u, g: x.g || 'seedling', kind: kind }); };
    (meta.links || []).forEach(function (x) { add(x, 'out'); }); (meta.backlinks || []).forEach(function (x) { add(x, 'in'); }); (meta.related || []).forEach(function (x) { add(x, 'rel'); });
    if (!nb.length) return '';
    nb = nb.slice(0, 10);
    var W = 560, H = 230, cx = W / 2, cy = H / 2, s = '';
    var pos = nb.map(function (n, i) { var a = -Math.PI / 2 + i * 2 * Math.PI / nb.length; return [cx + Math.cos(a) * 210, cy + Math.sin(a) * 82]; });
    nb.forEach(function (n, i) {
      var p = pos[i], mx = (cx + p[0]) / 2, my = (cy + p[1]) / 2, dx = p[0] - cx, dy = p[1] - cy, d = 'M' + cx + ' ' + cy + 'Q' + (mx - dy * 0.15).toFixed(1) + ' ' + (my + dx * 0.15).toFixed(1) + ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      s += '<path class="' + (n.kind === 'rel' ? 'lm-rel' : 'lm-vine') + '" d="' + d + '"/>';
      if (n.kind !== 'rel') s += gleaf(mx - dy * 0.07, my + dx * 0.07, i * 57, 7, 'var(--og-leaf2, #8fd65a)');
    });
    var node = function (x, y, label, g, cls, href) {
      var w = Math.min(170, label.length * 6.2 + 20), t = label.length > 26 ? label.slice(0, 25) + '...' : label;
      return (href ? '<a class="lm-node ' + cls + '" href="' + esc(href) + '">' : '<g class="lm-node ' + cls + '">') + '<title>' + esc(label) + '</title>' +
        '<rect x="' + (x - w / 2).toFixed(1) + '" y="' + (y - 11) + '" width="' + w.toFixed(1) + '" height="22" rx="6" data-g="' + esc(g) + '"/>' +
        '<text x="' + x.toFixed(1) + '" y="' + (y + 4) + '" text-anchor="middle">' + esc(t) + '</text>' + (href ? '</a>' : '</g>');
    };
    nb.forEach(function (n, i) { s += node(pos[i][0], pos[i][1], n.t, n.g, 'lm-' + n.kind, n.u); });
    s += node(cx, cy, L.thisNote || 'this note', meta.stage || 'seedling', 'lm-self', null);
    return '<svg class="lm" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(L.map || '') + '">' + s + '</svg>';
  }
  var chipList = function (items, cls) { return '<ul class="gn-chips">' + items.map(function (b) { return '<li><a class="gn-chip ' + (cls || '') + '" data-g="' + esc(b.g || 'seedling') + '" href="' + esc(b.u) + '">' + esc(b.t) + '</a></li>'; }).join('') + '</ul>'; };
  // a garden note's page (or the same note in the reader overlay), in the lab-notebook look
  function initGardenNote(root, meta) {
    var panel = root.querySelector('.post-panel'); if (!panel || !meta || panel.getAttribute('data-garden-ready')) return;
    panel.setAttribute('data-garden-ready', '1'); panel.classList.add('is-garden');
    var after = root.querySelector('.garden-after') || document.querySelector('.garden-after');
    var L = (after && readJson({ textContent: after.getAttribute('data-labels') })) || {};
    var head = panel.querySelector('.panel-head') || panel.firstElementChild, stage = meta.stage || 'seedling';
    var tendedTimes = (meta.log || []).filter(function (e) { return e.e === 'tended'; }).length;
    var dots = CONF[meta.confidence] ? '<span class="gn-conf" aria-hidden="true">' + [1, 2, 3, 4].map(function (k) { return '<i' + (k <= CONF[meta.confidence] ? '' : ' class="o"') + '></i>'; }).join('') + '</span>' + esc(meta.confidence) : '&mdash;';
    var mins = Math.max(1, Math.round((meta.words || 0) / 220));
    var spec = document.createElement('div'); spec.className = 'gn-spec';
    spec.innerHTML = '<div><b>' + esc(L.stage || 'Stage') + '</b><span class="gn-stage" data-g="' + esc(stage) + '">' + sprout(stage) + esc(stage) + '</span></div>' +
      '<div><b>' + esc(L.confidence || 'Confidence') + '</b>' + dots + '</div>' +
      '<div><b>' + esc(L.links || 'Links') + '</b>' + (meta.backlinks || []).length + ' ' + esc(L['in'] || 'in') + ' · ' + (meta.links || []).length + ' ' + esc(L.out || 'out') + '</div>' +
      '<div><b>' + esc(L.plantedH || 'Planted') + '</b>' + esc(gardenDay(meta.planted || meta.tended)) + '</div>' +
      '<div><b>' + esc(L.tendedH || 'Tended') + '</b>' + esc(gardenDay(meta.tended)) + (tendedTimes ? ' · ' + tendedTimes + ' ' + esc(tendedTimes === 1 ? (L.time || 'time') : (L.times || 'times')) : '') + '</div>' +
      '<div><b>' + esc(L.length || 'Length') + '</b>' + (meta.words || 0) + ' ' + esc(L.words || 'words') + ' · ' + mins + ' ' + esc(L.min || 'min') + '</div>';
    if (head) head.appendChild(spec);
    if (meta.tended) spec.insertAdjacentHTML('beforebegin', '<div class="gn-stamp-row" aria-hidden="true"><span class="gn-stamp">' + esc(L.tendedH || 'Tended') + ' ' + esc(gardenDay(meta.tended).replace(/ \d{4}$/, '')) + '</span></div>'); // its own line: it can't overlap anything
    if (meta.type === 'source') { panel.classList.add('is-source'); spec.insertAdjacentHTML('afterbegin', '<div class="gn-srcrow"><span class="garden-source">' + esc(L.source || 'Source') + (meta.kind ? ' · ' + esc(meta.kind) : '') + '</span></div>'); }
    var content = panel.querySelector('.gh-content');
    if (content) { gardenSidenotes(content, meta); gardenLinkIcons(content); }
    if (after && !after.getAttribute('data-ready')) {
      after.setAttribute('data-ready', '1');
      var log = meta.log || [], bl = meta.backlinks || [], rel = meta.related || [], out = '';
      if (log.length) out += '<section><h2 class="garden-h">' + esc(L.log || 'Tending log') + '</h2><ol class="gn-log">' + log.map(function (e) {
        return '<li data-g="' + esc(e.g || stage) + '"><i></i><time datetime="' + esc(e.d) + '">' + esc(gardenDay(e.d).replace(/ \d{4}$/, '')) + '</time><span>' + esc(e.e === 'stage' ? e.g : e.e === 'planted' ? (L.planted || 'planted') : (L.tended || 'tended')) + '</span></li>'; }).join('') + '</ol></section>';
      out += '<section><h2 class="garden-h">' + esc(after.getAttribute('data-mentioned')) + '</h2>' + (bl.length ? chipList(bl) : '<p class="garden-quiet">' + esc(after.getAttribute('data-none')) + '</p>') + '</section>';
      if (rel.length) out += '<section><h2 class="garden-h">' + esc(L.related || 'Related') + '</h2>' + chipList(rel, 'is-rel') + '</section>';
      var map = localMap(meta, L); if (map) out += '<section><h2 class="garden-h">' + esc(L.map || 'Nearby in the garden') + '</h2>' + map + '</section>';
      var list = after.querySelector('.garden-backlinks'); if (list) list.innerHTML = out;
      var back = after.querySelector('.garden-back'); if (back && !after.querySelector('.gn-keys')) back.insertAdjacentHTML('afterend', '<button type="button" class="gn-keys" data-gk="help"><kbd>?</kbd> ' + esc(L.keys || 'shortcuts') + '</button>');
    }
  }
  // footnotes move into the margin beside their paragraph on wide screens (or sit under it on narrow ones)
  function gardenSidenotes(content, meta) {
    var fns = meta.fn || []; if (!fns.length) return;
    var refs = [].filter.call(content.querySelectorAll('a[href^="#fn"]'), function (a) { return /^#fn\d+$/.test(a.getAttribute('href')) && !a.closest('ol'); });
    refs.forEach(function (a, i) {
      var f = fns[i]; if (!f) return;
      a.classList.add('gn-ref'); a.textContent = String(i + 1); a.removeAttribute('href'); a.setAttribute('aria-hidden', 'true');
      var block = a.closest('p, li, blockquote') || a.parentNode;
      var note = document.createElement('aside'); note.className = 'gn-side'; note.innerHTML = '<b>' + (i + 1) + '</b> ' + esc(f.text);
      block.parentNode.insertBefore(note, block.nextSibling); note._block = block;
    });
    var panel = content.closest('.post-panel'), wide = window.matchMedia('(min-width: 64rem)'); panel.classList.add('has-sidenotes');
    var heading = panel.querySelector('.panel-title, h1');
    var place = function () { // wide screens: level with its paragraph, in the margin; otherwise just under it
      var last = 0;
      content.style.paddingLeft = ''; // keep the text lined up with the heading while the margin takes room on the right
      if (wide.matches && heading) { var inset = heading.getBoundingClientRect().left - content.getBoundingClientRect().left; if (inset > 0) content.style.paddingLeft = inset + 'px'; }
      [].forEach.call(content.querySelectorAll('.gn-side'), function (n) {
        if (!wide.matches) { n.style.top = ''; return; }
        var top = Math.max(last, n._block.getBoundingClientRect().top - content.getBoundingClientRect().top);
        n.style.top = top + 'px'; last = top + n.offsetHeight + 12;
      });
    };
    place(); window.addEventListener('resize', place); if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    // Ghost keeps the footnotes as a plain list at the end, after a rule: it's replaced by the sidenotes
    [].forEach.call(content.querySelectorAll('ol'), function (ol) {
      if (ol.querySelector('a[href^="#fnref"]')) { var hr = ol.previousElementSibling; if (hr && hr.tagName === 'HR') hr.remove(); ol.remove(); }
    });
  }
  // small marks after external links, saying where they go
  function gardenLinkIcons(content) {
    [].forEach.call(content.querySelectorAll('a[href^="http"]'), function (a) {
      if (a.origin === location.origin || a.querySelector('img') || a.closest('.kg-card')) return;
      var h = a.hostname.replace(/^www\./, ''), k = /(^|\.)youtube\.com$|^youtu\.be$/.test(h) ? 'yt' : /(^|\.)github\.com$/.test(h) ? 'gh' : /(^|\.)wikipedia\.org$/.test(h) ? 'wp' : /\.pdf($|\?)/i.test(a.pathname) ? 'pdf' : 'ext';
      a.classList.add('gn-ext'); a.setAttribute('data-icon', k);
    });
  }
  // hover a link to another note to see its first lines, without leaving (pointing devices only)
  var previewCache = {};
  function gardenPreview(a) {
    var url = a.href.split('#')[0];
    if (!previewCache[url]) previewCache[url] = fetch(url, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (html) {
      if (!html) return null; var doc = new DOMParser().parseFromString(html, 'text/html'), m = readJson(doc.getElementById('garden-note'));
      var t = doc.querySelector('.post-panel .panel-title, .post-panel h1'), p = doc.querySelector('.post-panel .gh-content p');
      return t ? { t: t.textContent.trim(), x: p ? p.textContent.trim().slice(0, 170) : '', g: m ? m.stage : null, links: m ? (m.backlinks || []).length + ' in · ' + (m.links || []).length + ' out' : '' } : null;
    }).catch(function () { return null; });
    return previewCache[url];
  }
  (function () {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var tip = null, timer = null;
    var hide = function () { clearTimeout(timer); if (tip) { tip.remove(); tip = null; } };
    document.addEventListener('mouseover', function (e) {
      var a = e.target.closest && e.target.closest('.post-panel.is-garden .gh-content a[href]'); if (!a || a.origin !== location.origin || a.hash) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        gardenPreview(a).then(function (d) {
          if (!d || !a.matches(':hover')) return; hide();
          tip = document.createElement('div'); tip.className = 'gn-preview'; tip.setAttribute('data-g', d.g || 'post');
          tip.innerHTML = '<div class="gn-preview-m">' + esc([d.g, d.links].filter(Boolean).join(' · ')) + '</div><b>' + esc(d.t) + '</b>' + (d.x ? '<p>' + esc(d.x) + (d.x.length >= 170 ? '...' : '') + '</p>' : '');
          (a.closest('dialog') || document.body).appendChild(tip);
          var r = a.getBoundingClientRect(), w = tip.offsetWidth;
          tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px'; tip.style.top = (r.bottom + 8) + 'px';
        });
      }, 260);
    });
    document.addEventListener('mouseout', function (e) { var a = e.target.closest && e.target.closest('.post-panel.is-garden .gh-content a[href]'); if (a && !a.contains(e.relatedTarget)) hide(); });
    document.addEventListener('scroll', hide, true);
  })();

  // the Garden page
  // The map: notes as tiny cards in their stage colours, links you wrote as leafy vines, related notes dotted.
  // Point at a note and its neighbours light up while the rest fades.
  function drawGardenMap(box, notes) {
    var W = box.clientWidth || 600, H = stacked.matches ? 360 : 460, idx = {}, edges = [], rels = [];
    notes.forEach(function (n, i) { idx[n.s] = i; });
    notes.forEach(function (n, i) {
      (n.l || []).forEach(function (s) { if (idx[s] !== undefined && idx[s] !== i) edges.push([i, idx[s]]); });
      (n.r || []).forEach(function (s) { var j2 = idx[s]; if (j2 !== undefined && j2 > i) rels.push([i, j2]); });
    });
    var deg = notes.map(function () { return 0; }); edges.forEach(function (e) { deg[e[0]]++; deg[e[1]]++; });
    var label = function (t) { return t.length > 24 ? t.slice(0, 23) + '...' : t; };
    var size = notes.map(function (n) { return [Math.min(180, label(n.t).length * 6.1 + 22), 22]; });
    var rand = seeded(notes.length * 131 + 7), P = notes.map(function () { return { x: W * (0.15 + rand() * 0.7), y: H * (0.15 + rand() * 0.7), vx: 0, vy: 0 }; });
    for (var step = 0; step < 320; step++) { // linked notes pull together; cards push apart by their size; all stay near the middle
      var cool = 1 - step / 320;
      for (var a = 0; a < P.length; a++) for (var c = a + 1; c < P.length; c++) {
        var dx = P[a].x - P[c].x, dy = P[a].y - P[c].y, need = (size[a][0] + size[c][0]) / 2 + 14, ox = need - Math.abs(dx), oy = 36 - Math.abs(dy);
        var d2 = dx * dx + dy * dy + 0.01, f = 1400 / d2, d = Math.sqrt(d2);
        P[a].vx += dx / d * f; P[a].vy += dy / d * f; P[c].vx -= dx / d * f; P[c].vy -= dy / d * f;
        if (ox > 0 && oy > 0) { var sgn = dx >= 0 ? 1 : -1, sy = dy >= 0 ? 1 : -1; if (oy < ox * 0.6) { P[a].vy += sy * oy * 0.3; P[c].vy -= sy * oy * 0.3; } else { P[a].vx += sgn * ox * 0.15; P[c].vx -= sgn * ox * 0.15; } }
      }
      edges.forEach(function (e) { var p = P[e[0]], q = P[e[1]], dx2 = q.x - p.x, dy2 = q.y - p.y, d3 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1, f2 = (d3 - 130) * 0.02; p.vx += dx2 / d3 * f2; p.vy += dy2 / d3 * f2; q.vx -= dx2 / d3 * f2; q.vy -= dy2 / d3 * f2; });
      P.forEach(function (p, i) { p.vx += (W / 2 - p.x) * 0.003; p.vy += (H / 2 - p.y) * 0.006; p.x += Math.max(-9, Math.min(9, p.vx * cool)); p.y += Math.max(-9, Math.min(9, p.vy * cool)); p.vx *= 0.5; p.vy *= 0.5;
        p.x = Math.max(size[i][0] / 2 + 6, Math.min(W - size[i][0] / 2 - 6, p.x)); p.y = Math.max(18, Math.min(H - 18, p.y)); });
    }
    var curve = function (p, q) { var mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, dx = q.x - p.x, dy = q.y - p.y; return { d: 'M' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + 'Q' + (mx - dy * 0.16).toFixed(1) + ' ' + (my + dx * 0.16).toFixed(1) + ' ' + q.x.toFixed(1) + ' ' + q.y.toFixed(1), mx: mx - dy * 0.08, my: my + dx * 0.08 }; };
    var svg = '<svg class="gm" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">';
    rels.forEach(function (e) { svg += '<path class="gm-rel" data-a="' + e[0] + '" data-b="' + e[1] + '" d="' + curve(P[e[0]], P[e[1]]).d + '"/>'; });
    edges.forEach(function (e, k) { var cv = curve(P[e[0]], P[e[1]]); svg += '<g class="gm-vine" data-a="' + e[0] + '" data-b="' + e[1] + '"><path d="' + cv.d + '"/>' + gleaf(cv.mx, cv.my, k * 67, 8, 'var(--og-leaf2, #8fd65a)') + '</g>'; });
    notes.forEach(function (n, i) {
      var w = size[i][0], x = P[i].x - w / 2, y = P[i].y - 11;
      svg += '<a href="/' + esc(n.s) + '/" class="garden-node" data-i="' + i + '" data-g="' + esc(n.g) + '"><title>' + esc(n.t) + '</title><rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="22" rx="' + (n.k === 'source' ? 2 : 6) + '" data-k="' + esc(n.k) + '"/>' +
        '<text x="' + P[i].x.toFixed(1) + '" y="' + (P[i].y + 4).toFixed(1) + '" text-anchor="middle">' + esc(label(n.t)) + '</text></a>';
    });
    box.innerHTML = svg + '</svg>';
    var map = box.querySelector('svg'), nearOf = function (i) { var s = {}; s[i] = 1; edges.concat(rels).forEach(function (e) { if (e[0] == i) s[e[1]] = 1; if (e[1] == i) s[e[0]] = 1; }); return s; };
    map.addEventListener('mouseover', function (e) {
      var a = e.target.closest('.garden-node'); if (!a) return; var i = +a.getAttribute('data-i'), near = nearOf(i); map.classList.add('is-focus');
      [].forEach.call(map.querySelectorAll('.garden-node'), function (n) { n.classList.toggle('is-near', !!near[n.getAttribute('data-i')]); });
      [].forEach.call(map.querySelectorAll('.gm-vine, .gm-rel'), function (g) { g.classList.toggle('is-near', g.getAttribute('data-a') == i || g.getAttribute('data-b') == i); });
    });
    map.addEventListener('mouseleave', function () { map.classList.remove('is-focus'); });
  }
  function gleaf(x, y, a, len, fill) {
    var r = a * Math.PI / 180, cx = x + Math.cos(r) * len, cy = y + Math.sin(r) * len, px = Math.cos(r + Math.PI / 2) * len * 0.33, py = Math.sin(r + Math.PI / 2) * len * 0.33;
    return '<path class="og-leaf" d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'Q' + ((x + cx) / 2 + px).toFixed(1) + ' ' + ((y + cy) / 2 + py).toFixed(1) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + 'Q' + ((x + cx) / 2 - px).toFixed(1) + ' ' + ((y + cy) / 2 - py).toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + 'Z" fill="' + fill + '"/>';
  }
  var FLOWERS = ['#ff6b9a', '#ffd23f', '#9b5de5', '#ff8c42', '#f15bb5']; // (also read by gflower, at call time)
  function gflower(x, y, r, c) {
    var o = ''; for (var i = 0; i < 5; i++) { var a = i * 72 * Math.PI / 180; o += '<circle cx="' + (x + Math.cos(a) * r * 0.62).toFixed(1) + '" cy="' + (y + Math.sin(a) * r * 0.62).toFixed(1) + '" r="' + (r * 0.5).toFixed(1) + '" fill="' + c + '"/>'; }
    return '<g class="og-flower">' + o + '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (r * 0.36).toFixed(1) + '" fill="#ffd23f"/></g>';
  }
  function hashOf(s) { var h = 7; for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 2654435761); return h >>> 0; }
  // vines creep clockwise round a card from its top-left corner: the more links, the further round (all the way at 9)
  function growCards(box) {
    [].forEach.call(box.querySelectorAll('.og'), function (c) {
      var old = c.querySelector('.og-vines'); if (old) old.remove();
      var W = c.offsetWidth, H = c.offsetHeight, links = +c.getAttribute('data-links') || 0; if (!W || !links) return;
      var per = 2 * (W + H), reach = Math.min(1, links / 9) * per, pts = [], rand = seeded(hashOf(c.getAttribute('data-note')));
      for (var s = 0; s <= reach; s += 6) {
        var p = s % per, x, y;
        if (p < W) { x = p; y = 0; } else if (p < W + H) { x = W; y = p - W; } else if (p < 2 * W + H) { x = W - (p - W - H); y = H; } else { x = 0; y = H - (p - 2 * W - H); }
        var wob = Math.sin(s / 11) * 4; pts.push([x + (y === 0 || y === H ? 0 : wob) + 10, y + (x === 0 || x === W ? 0 : wob) + 10]);
      }
      var v = '<path class="og-stem" d="M' + pts.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + '"/>';
      pts.forEach(function (q, i) {
        if (i % 4 === 2) v += gleaf(q[0], q[1], rand() * 360, 10, i % 8 ? 'var(--og-leaf)' : 'var(--og-leaf2)');
        if (c.getAttribute('data-g') === 'evergreen' && i % 11 === 5) v += gflower(q[0], q[1], 6, FLOWERS[(i / 11 | 0) % FLOWERS.length]);
      });
      c.insertAdjacentHTML('beforeend', '<svg class="og-vines" aria-hidden="true" viewBox="0 0 ' + (W + 20) + ' ' + (H + 20) + '">' + v + '</svg>');
    });
  }
  // Cards that link to each other on the same page are joined by a vine, growing behind the cards (it shows
  // in the gaps). Faint at rest, bright for the card you point at; click it to see what the link says.
  function linkCards(box, bySlug, L) {
    var old = box.querySelector('.og-links'); if (old) old.remove();
    var cards = {}; [].forEach.call(box.querySelectorAll('.og'), function (c) { cards[c.getAttribute('data-note')] = c; });
    var B = box.getBoundingClientRect(), svg = '', seen = {};
    Object.keys(cards).forEach(function (a) {
      ((bySlug[a] && bySlug[a].l) || []).forEach(function (b) {
        if (!cards[b] || seen[a + '|' + b] || seen[b + '|' + a]) return; seen[a + '|' + b] = 1;
        var ra = cards[a].getBoundingClientRect(), rb = cards[b].getBoundingClientRect();
        var ax = ra.left - B.left + ra.width / 2, ay = ra.top - B.top + ra.height / 2, bx = rb.left - B.left + rb.width / 2, by = rb.top - B.top + rb.height / 2, dx = bx - ax, dy = by - ay;
        var c1 = [ax + dx * 0.3 - dy * 0.22, ay + dy * 0.3 + dx * 0.22], c2 = [ax + dx * 0.7 - dy * 0.22, ay + dy * 0.7 + dx * 0.22];
        var d = 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + 'C' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1);
        var leaves = '', rand = seeded(hashOf(a + b));
        for (var t = 0.1; t < 0.95; t += 0.09) { var u = 1 - t, x = u * u * u * ax + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * bx, y = u * u * u * ay + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * by; leaves += gleaf(x, y, rand() * 360, 8, 'var(--og-leaf2)'); }
        svg += '<g class="og-link" data-a="' + esc(a) + '" data-b="' + esc(b) + '"><path class="og-link-stem" d="' + d + '"/>' + leaves + '<path class="og-link-hit" d="' + d + '"><title>' + esc(bySlug[a].t) + ' → ' + esc(bySlug[b].t) + '</title></path></g>';
      });
    });
    if (!svg) return;
    box.insertAdjacentHTML('afterbegin', '<svg class="og-links" aria-hidden="true" width="' + B.width + '" height="' + B.height + '" viewBox="0 0 ' + B.width + ' ' + B.height + '">' + svg + '</svg>');
    if (box.getAttribute('data-linked')) return; box.setAttribute('data-linked', '1');
    var lit = function (slug, on) { [].forEach.call(box.querySelectorAll('.og-link[data-a="' + slug + '"], .og-link[data-b="' + slug + '"]'), function (g) { g.classList.toggle('is-lit', on); }); };
    box.addEventListener('mouseover', function (e) { var c = e.target.closest && e.target.closest('.og'); if (c) lit(c.getAttribute('data-note'), true); });
    box.addEventListener('mouseout', function (e) { var c = e.target.closest && e.target.closest('.og'); if (c && !c.contains(e.relatedTarget)) lit(c.getAttribute('data-note'), false); });
    box.addEventListener('click', function (e) {
      var g = e.target.closest && e.target.closest('.og-link'); if (!g) return;
      e.preventDefault(); openLinkPanel(box, g, e, bySlug, L);
    });
  }
  function closeLinkPanel() {
    var p = document.querySelector('.og-panel'); if (p) p.remove();
    [].forEach.call(document.querySelectorAll('.og-link.is-chosen, .og.is-chosen'), function (n) { n.classList.remove('is-chosen'); });
  }
  function openLinkPanel(box, g, e, bySlug, L) {
    closeLinkPanel();
    var a = bySlug[g.getAttribute('data-a')], b = bySlug[g.getAttribute('data-b')]; if (!a || !b) return;
    g.classList.add('is-chosen');
    [a.s, b.s].forEach(function (s) { var c = box.querySelector('.og[data-note="' + s + '"]'); if (c) c.classList.add('is-chosen'); });
    var said = (a.q && a.q[b.s]) || '', B = box.getBoundingClientRect();
    var html = '<div class="og-panel" role="dialog" aria-label="' + esc(L.link || 'A link you wrote') + '"><button type="button" class="og-panel-x" aria-label="Close">&times;</button>' +
      '<div class="og-panel-h">' + esc(L.link || 'A link you wrote') + '</div>' +
      '<div class="og-panel-pair"><a href="/' + esc(a.s) + '/" data-note="' + esc(a.s) + '" data-g="' + esc(a.g) + '">' + esc(a.t) + '</a><span aria-hidden="true">&rarr;</span><a href="/' + esc(b.s) + '/" data-note="' + esc(b.s) + '" data-g="' + esc(b.g) + '">' + esc(b.t) + '</a></div>' +
      (said ? '<blockquote class="og-panel-q">' + esc(said) + '</blockquote>' : '') + '</div>';
    box.insertAdjacentHTML('beforeend', html);
    var p = box.querySelector('.og-panel'), x = Math.min(B.width - p.offsetWidth - 4, Math.max(0, e.clientX - B.left - 40)), y = e.clientY - B.top + 14;
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.querySelector('.og-panel-x').addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); closeLinkPanel(); });
  }
  document.addEventListener('click', function (e) { if (document.querySelector('.og-panel') && !(e.target.closest && e.target.closest('.og-panel, .og-link'))) closeLinkPanel(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.querySelector('.og-panel')) closeLinkPanel(); });
  // The Scatter wall's garden patch: on hover, two or three flowers bloom in the grass, in colours picked
  // afresh each time; clicking it opens the note in the garden.
  function initPatches(root) {
    [].forEach.call(root.querySelectorAll('.scatter-patch'), function (a) {
      if (a.getAttribute('data-ready')) return; a.setAttribute('data-ready', '1');
      var svg = a.querySelector('svg'), NS = 'http://www.w3.org/2000/svg', SLOTS = [[10, 9], [15, 6], [20, 8.5], [25, 5.5], [31, 7.5], [36, 9.5]];
      var bloom = function () {
        if (svg.querySelector('.patch-flower')) return;
        var slots = SLOTS.slice().sort(function () { return Math.random() - 0.5; }), n = 2 + (Math.random() < 0.5 ? 1 : 0);
        // flowers in colours that stand out from this card: skip any too close to its own colour
        var rgb = function (s) { // any CSS colour (hex, rgb, oklch...) as red, green, blue: paint one pixel and read it back
          var cv = rgb.cv || (rgb.cv = document.createElement('canvas')), x = cv.getContext('2d', { willReadFrequently: true });
          cv.width = cv.height = 1; x.clearRect(0, 0, 1, 1); x.fillStyle = '#000'; x.fillStyle = s; x.fillRect(0, 0, 1, 1);
          var d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
        };
        // the card's settled colour: its colour animates (on hover, and while the page switches light or dark),
        // so pause that animation for the moment of reading
        var cardEl = a.closest('.scatter-card') || a, was = cardEl.style.transition; cardEl.style.transition = 'none';
        var bg = rgb(getComputedStyle(cardEl).backgroundColor); cardEl.style.transition = was;
        var hsl = function (c) { var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
          if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
          var l = (mx + mn) / 2; return [h, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l]; };
        var card = hsl(bg), far = FLOWERS.filter(function (c) { // skip flowers too close in hue to a strongly coloured card
          if (card[1] < 0.35) return true; var dh = Math.abs(hsl(rgb(c))[0] - card[0]); return Math.min(dh, 360 - dh) > 40; });
        var colours = (far.length >= 2 ? far : FLOWERS).slice().sort(function () { return Math.random() - 0.5; }); n = Math.min(n, colours.length);
        for (var i = 0; i < n; i++) {
          var x = slots[i][0], y = slots[i][1], r = 2.6 + Math.random() * 0.8, g = document.createElementNS(NS, 'g');
          g.setAttribute('class', 'patch-flower'); g.style.transitionDelay = (i * 0.09).toFixed(2) + 's';
          g.innerHTML = '<path class="patch-stem" d="M' + x + ' 21.5C' + (x - 1) + ' 17 ' + (x + 1) + ' ' + (y + 5) + ' ' + x + ' ' + (y + 1) + '"/>' + gflower(x, y, r, colours[i]);
          svg.appendChild(g);
        }
        void svg.getBoundingClientRect(); a.classList.add('is-blooming');
      };
      var fade = function () {
        a.classList.remove('is-blooming');
        setTimeout(function () { if (!a.classList.contains('is-blooming')) [].forEach.call(svg.querySelectorAll('.patch-flower'), function (f) { f.remove(); }); }, 320);
      };
      a.addEventListener('mouseenter', bloom); a.addEventListener('focus', bloom);
      a.addEventListener('mouseleave', fade); a.addEventListener('blur', fade);
    });
  }
  initPatches(document);
  // Keyboard shortcuts on garden pages: / search the garden, r a random note, g the garden, ? this list.
  // The garden's notes come from the Garden page's map data (fetched once when needed, off the Garden page).
  (function () {
    var gk = document.querySelector('.gk'); if (!gk) return;
    var L = readJson({ textContent: gk.getAttribute('data-labels') }) || {}, gardenUrl = gk.getAttribute('data-garden'), data = null;
    var onGarden = function () { return !!document.querySelector('.garden') || !!document.querySelector('.post-panel.is-garden') || !!document.getElementById('garden-note'); };
    var notes = function () {
      if (data) return data;
      var here = readJson(document.getElementById('garden-data'));
      data = here ? Promise.resolve(here.notes || []) : fetch(gardenUrl, { credentials: 'same-origin' }).then(function (r) { return r.text(); })
        .then(function (h) { var d = readJson(new DOMParser().parseFromString(h, 'text/html').getElementById('garden-data')); return (d && d.notes) || []; }).catch(function () { return []; });
      return data;
    };
    var open = function (slug) { closePanel(); if (window.dungeonOpen) window.dungeonOpen('/' + slug + '/'); else location.href = '/' + slug + '/'; };
    var panel = null;
    var closePanel = function () { if (panel) { panel.remove(); panel = null; } };
    var show = function (html) {
      closePanel(); panel = document.createElement('div'); panel.className = 'gk-panel'; panel.setAttribute('role', 'dialog'); panel.innerHTML = html;
      (document.querySelector('dialog[open]') || document.body).appendChild(panel);
      panel.addEventListener('click', function (e) { if (e.target === panel || e.target.closest('.gk-x')) closePanel(); });
    };
    var help = function () {
      show('<div class="gk-box"><button type="button" class="gk-x" aria-label="' + esc(L.close) + '">&times;</button><h2 class="garden-h">' + esc(L.keys) + '</h2><dl>' +
        [['/', L.s], ['r', L.r], ['g', L.g], ['?', L.h]].map(function (k) { return '<dt><kbd>' + k[0] + '</kbd></dt><dd>' + esc(k[1]) + '</dd>'; }).join('') + '</dl></div>');
    };
    var search = function () {
      show('<div class="gk-box gk-search"><input type="search" placeholder="' + esc(L.search) + '" aria-label="' + esc(L.search) + '"><ol class="gk-results"></ol></div>');
      var input = panel.querySelector('input'), res = panel.querySelector('.gk-results'), sel = 0, found = [];
      var draw = function () {
        res.innerHTML = found.length ? found.map(function (n, i) { return '<li' + (i === sel ? ' class="is-sel"' : '') + ' data-s="' + esc(n.s) + '">' + sprout(n.g) + '<b>' + esc(n.t) + '</b><span>' + esc((n.x || '').slice(0, 90)) + '</span></li>'; }).join('') : (input.value ? '<li class="gk-none">' + esc(L.none) + '</li>' : '');
      };
      notes().then(function (all) {
        var run = function () {
          var q = input.value.trim().toLowerCase(); sel = 0;
          found = !q ? [] : all.map(function (n) { var t = n.t.toLowerCase(), x = (n.x || '').toLowerCase(); return [t.indexOf(q) === 0 ? 3 : t.indexOf(q) >= 0 ? 2 : x.indexOf(q) >= 0 ? 1 : 0, n]; })
            .filter(function (p) { return p[0]; }).sort(function (a, b) { return b[0] - a[0] || a[1].t.localeCompare(b[1].t); }).slice(0, 8).map(function (p) { return p[1]; });
          draw();
        };
        input.addEventListener('input', run);
        input.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowDown') { sel = Math.min(found.length - 1, sel + 1); draw(); e.preventDefault(); }
          else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
          else if (e.key === 'Enter' && found[sel]) open(found[sel].s);
        });
        res.addEventListener('click', function (e) { var li = e.target.closest('li[data-s]'); if (li) open(li.getAttribute('data-s')); });
      });
      input.focus();
    };
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-gk="help"]')) { e.preventDefault(); help(); } });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel) { closePanel(); e.preventDefault(); e.stopPropagation(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || !onGarden()) return;
      var t = e.target; if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      if (e.key === '/') { e.preventDefault(); search(); }
      else if (e.key === '?') { e.preventDefault(); help(); }
      else if (e.key === 'r') { e.preventDefault(); notes().then(function (all) { if (all.length) open(all[Math.floor(Math.random() * all.length)].s); }); }
      else if (e.key === 'g') { e.preventDefault(); closePanel(); location.href = gardenUrl; }
    }, true);
  })();
  function initGarden() {
    var el = document.querySelector('.garden'); if (!el) return;
    var data = readJson(document.getElementById('garden-data')), L = readJson({ textContent: el.getAttribute('data-labels') }) || {};
    if (!data || !data.notes || !data.notes.length) { var empty = document.querySelector('.garden-empty'); if (empty) empty.hidden = false; return; }
    var notes = data.notes, inbound = {};
    notes.forEach(function (n) { (n.l || []).forEach(function (s) { inbound[s] = (inbound[s] || 0) + 1; }); });
    var degree = function (n) { return (inbound[n.s] || 0) + (n.l || []).length; };
    var count = function (g) { return notes.filter(function (n) { return n.g === g; }).length; };
    el.querySelector('.garden-stats').innerHTML = '<b>' + notes.length + '</b> ' + esc(L.notes) + ' · <b>' + count('evergreen') + '</b> ' + esc(L.evergreen) + ' · <b>' + count('growing') + '</b> ' + esc(L.growing) + ' · <b>' + count('seedling') + '</b> ' + esc(L.seedlings);
    var bySlug = {}; notes.forEach(function (n) { bySlug[n.s] = n; });
    var trim = function (s, max) { s = String(s || ''); return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, '') + '...' : s; };
    // Overgrown cards, sized to their content: vines creep round the edges as a note gains links,
    // flowers open on evergreens, and a stack of pages behind shows how much has been written.
    var card = function (n) {
      var ins = inbound[n.s] || 0, outs = (n.l || []).length, w = n.w || 0;
      var label = n.k === 'source' ? L.source + (n.kind ? ' · ' + n.kind : '') : (L[n.g] || n.g) + (n.p && n.p[0] ? ' · ' + n.p[0] : '');
      return '<a class="og" href="/' + esc(n.s) + '/" data-note="' + esc(n.s) + '" data-g="' + esc(n.g) + '" data-k="' + esc(n.k) + '" data-links="' + (ins + outs) + '">' +
        (w > 1000 ? '<span class="og-page og-page-2" aria-hidden="true"></span>' : '') + (w > 300 ? '<span class="og-page" aria-hidden="true"></span>' : '') +
        '<span class="og-sheet" aria-hidden="true"></span><span class="og-text"><span class="og-meta">' + esc(label) + '</span><span class="og-title">' + esc(n.t) + '</span>' +
        (n.x ? '<span class="og-ex">' + esc(trim(n.x, 150)) + '</span>' : '') + '</span><span class="og-foot">' + ins + ' in · ' + outs + ' out</span></a>';
    };
    var recent = notes.slice().sort(function (a, b) { return (b.d || '').localeCompare(a.d || ''); }).slice(0, 8);
    var recentBox = el.querySelector('[data-list="recent"]'); recentBox.innerHTML = recent.map(card).join('');
    var connected = notes.filter(function (n) { return degree(n) > 0; }).sort(function (a, b) { return degree(b) - degree(a); }).slice(0, 8);
    var cs = el.querySelector('[data-list="connected"]');
    if (connected.length) cs.innerHTML = connected.map(card).join(''); else cs.closest('.garden-section').hidden = true;
    var growAll = function () { [recentBox, cs].forEach(function (box) { if (!box.closest('.garden-section').hidden) { growCards(box); linkCards(box, bySlug, L); } }); };
    var topics = {};
    notes.forEach(function (n) { (n.p && n.p.length ? n.p : [L.other]).forEach(function (t) { (topics[t] = topics[t] || []).push(n); }); });
    el.querySelector('.garden-topics').innerHTML = Object.keys(topics).sort(function (a, b) { return topics[b].length - topics[a].length || a.localeCompare(b); }).map(function (t) {
      return '<div class="garden-topic"><h3>' + esc(t) + ' <span>' + topics[t].length + '</span></h3><ul>' + topics[t].sort(function (a, b) { return a.t.localeCompare(b.t); }).map(function (n) {
        return '<li><a href="/' + esc(n.s) + '/">' + sprout(n.g) + esc(n.t) + '</a></li>'; }).join('') + '</ul></div>';
    }).join('');
    var all = el.querySelector('[data-list="all"]'), order = { evergreen: 0, growing: 1, seedling: 2 };
    var drawAll = function (how) {
      var list = notes.slice().sort(how === 'recent' ? function (a, b) { return (b.d || '').localeCompare(a.d || ''); } : how === 'stage' ? function (a, b) { return order[a.g] - order[b.g] || a.t.localeCompare(b.t); } : function (a, b) { return a.t.localeCompare(b.t); });
      all.innerHTML = list.map(function (n) { return '<li><a href="/' + esc(n.s) + '/">' + esc(n.t) + '</a><span class="garden-dots" aria-hidden="true"></span>' + sprout(n.g) + '<time datetime="' + esc(n.d) + '">' + esc(gardenDay(n.d)) + '</time></li>'; }).join('');
    };
    drawAll('az');
    el.querySelector('.garden-sort').addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      [].forEach.call(this.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      drawAll(b.getAttribute('data-sort'));
    });
    el.querySelector('.garden-random').addEventListener('click', function () { // pull a card from the deck
      var pick = notes[Math.floor(Math.random() * notes.length)], btn = this;
      var go = function () { if (window.dungeonOpen) window.dungeonOpen('/' + pick.s + '/'); else location.href = '/' + pick.s + '/'; };
      if (calmStamps) { go(); return; }
      btn.classList.add('is-pulling'); setTimeout(function () { btn.classList.remove('is-pulling'); go(); }, 460);
    });
    el.hidden = false;
    growAll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(growAll); // card heights settle once the fonts arrive
    var growT; window.addEventListener('resize', function () { clearTimeout(growT); growT = setTimeout(growAll, 250); });
    drawGardenMap(el.querySelector('.garden-map'), notes);
    var mapT; window.addEventListener('resize', function () { clearTimeout(mapT); mapT = setTimeout(function () { drawGardenMap(el.querySelector('.garden-map'), notes); }, 250); });
  }
  initGarden();
  initGardenNote(document, readJson(document.getElementById('garden-note')));

  function closeReader() { if (reader && reader.open) reader.close(); }
  // In the overlay, the browser closes the dialog on Escape by itself. If the blank sticky has writing
  // on it, Escape clears that first and keeps the overlay open; pressed again, it closes as usual.
  if (reader) reader.addEventListener('cancel', function (e) {
    var liftedHere = document.querySelector('.reader .stickies');
    if (liftedHere && liftedHere._focus) { e.preventDefault(); dismissSticky(liftedHere); return; } // a lifted sticky goes back first
    var written = document.querySelector('.reader .stickies-compose');
    if (written && (written.querySelector('textarea').value || written.querySelector('input').value)) { e.preventDefault(); throwComposer(written.closest('.stickies')); }
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
        var gardenMeta = doc.getElementById('garden-note'); // a garden note's stage, tended date and backlinks
        var stickiesHere = doc.querySelector('.stickies'); // the stickies come across too, inside the card: one piece
        if (stickiesHere) body.querySelector('.post-panel').appendChild(document.importNode(stickiesHere, true));
        var afterHere = doc.querySelector('.garden-after'); // a garden note's "Mentioned in" comes too
        if (afterHere) body.querySelector('.post-panel').appendChild(document.importNode(afterHere, true));
        decorate(body);
        initPostActions(body);
        initStamps(body);
        liteYouTube(body);
        document.documentElement.classList.add('reader-open');
        var already = reader.open; // following a link inside the overlay: still one history step, not one per note
        if (!already) reader.showModal();
        initStickies(body); // after it's open, so the pile can be measured
        if (gardenMeta) initGardenNote(body, readJson(gardenMeta));
        reader.scrollTop = 0;
        document.title = doc.title || baseTitle;
        if (already) history.replaceState({ reader: true }, '', url);
        else { baseUrl = location.href; history.pushState({ reader: true }, '', url); pushed = true; }
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

    // garden notes open in the overlay too: the cards, lists, map, the connection panel and "Mentioned in"
    window.dungeonOpen = function (url) { openPost(url, null); };
    document.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('.garden .og, .garden-topic a, .garden-all a, .garden-node, .og-panel a, .garden-after .garden-backlinks a, .scatter-patch, .gn-chip, .lm-node, .post-panel.is-garden .gh-content a[href]');
      if (!link || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var href = link.getAttribute('href') || (link.href && link.href.baseVal); if (!href) return;
      var url = new URL(href, location.href); if (url.origin !== location.origin || (url.hash && url.pathname === location.pathname)) return;
      e.preventDefault(); closeLinkPanel();
      openPost(url.href, link.classList.contains('og') ? link : null);
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
