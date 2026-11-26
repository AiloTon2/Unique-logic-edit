/* SEM pages: SERVICES carousels. Each [data-sem-carousel] pages on its own. */
(function () {
  function setup(root) {
    var mode = root.getAttribute('data-sem-carousel');
    var slides = Array.prototype.slice.call(root.querySelectorAll(mode === 'peek' ? '.sem-g-slide' : '.sem-b-slide'));
    var viewport = root.querySelector('.sem-g-viewport') || root.querySelector('.sem-b-stage');
    var dotsWrap = root.querySelector('[data-dots]');
    var index = 0;
    if (!slides.length) return;

    var dots = slides.map(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sem-dot';
      b.setAttribute('aria-label', (i + 1) + ' / ' + slides.length);
      b.addEventListener('click', function () { go(i); });
      dotsWrap.appendChild(b);
      return b;
    });

    function place() {
      if (mode !== 'peek') return;
      var len = slides.length;
      slides.forEach(function (s, n) {
        var rel = (n - index + len) % len;
        if (rel > len / 2) rel -= len;
        s.style.setProperty('--rel', rel);
        s.classList.toggle('is-far', Math.abs(rel) > 1);
      });
    }

    function go(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        var on = n === index;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      dots.forEach(function (d, n) {
        d.classList.toggle('is-active', n === index);
        d.setAttribute('aria-current', n === index ? 'true' : 'false');
      });
      place();
    }

    root.querySelector('[data-prev]').addEventListener('click', function () { go(index - 1); });
    root.querySelector('[data-next]').addEventListener('click', function () { go(index + 1); });

    if (mode === 'peek') {
      slides.forEach(function (s, n) {
        s.addEventListener('click', function () { if (n !== index) go(n); });
      });
    }

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') go(index - 1);
      if (e.key === 'ArrowRight') go(index + 1);
    });

    var startX = null;
    viewport.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    viewport.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      startX = null;
    });

    go(0);
  }

  function setupCompareGlow(wrap) {
    var msCells = Array.prototype.slice.call(wrap.querySelectorAll('.sem-vs-ms, tbody td:last-child'));
    var googleCells = Array.prototype.slice.call(wrap.querySelectorAll('.sem-vs-google, tbody td:nth-child(2)'));
    if (!msCells.length) return;

    var locked = false;
    var resetTimer = null;

    function clearReset() {
      if (!resetTimer) return;
      window.clearTimeout(resetTimer);
      resetTimer = null;
    }

    function showMicrosoft(lock) {
      clearReset();
      locked = !!lock;
      wrap.classList.add('is-ms-active');
      wrap.classList.toggle('is-ms-locked', locked);
    }

    function showGoogle(lock) {
      clearReset();
      locked = !!lock;
      wrap.classList.remove('is-ms-active');
      wrap.classList.toggle('is-ms-locked', locked);
    }

    function reset() {
      clearReset();
      locked = false;
      wrap.classList.remove('is-ms-active', 'is-ms-locked');
    }

    function queueHoverReset() {
      if (locked) return;
      clearReset();
      resetTimer = window.setTimeout(reset, 3000);
    }

    msCells.forEach(function (cell) {
      cell.addEventListener('mouseenter', function () {
        if (!locked) showMicrosoft(false);
      });
      cell.addEventListener('click', function () { showMicrosoft(true); });
    });

    googleCells.forEach(function (cell) {
      cell.addEventListener('mouseenter', function () {
        if (!locked) showGoogle(false);
      });
      cell.addEventListener('click', function () { showGoogle(true); });
    });

    wrap.addEventListener('mouseleave', queueHoverReset);

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) reset();
        });
      }, { threshold: 0.05 });
      observer.observe(wrap);
    }
  }

  function setupColumnGlow(wrap) {
    var rows = Array.prototype.slice.call(wrap.querySelectorAll('tr'));
    var cols = rows.length ? rows[0].children.length : 0;
    if (cols < 3) return;

    var active = 1;
    var locked = false;
    var resetTimer = null;

    function show(col, lock) {
      if (resetTimer) {
        window.clearTimeout(resetTimer);
        resetTimer = null;
      }
      active = col;
      locked = !!lock;
      rows.forEach(function (row) {
        Array.prototype.forEach.call(row.children, function (cell, n) {
          cell.classList.toggle('is-on', n === active);
        });
      });
      var triTone = wrap.classList.contains('sem-mv-wrap--tri-tone');
      wrap.classList.toggle('is-mid', triTone && active === 2);
      wrap.classList.toggle('is-alt', triTone ? active === 3 : active !== 1);
    }

    rows.forEach(function (row) {
      Array.prototype.forEach.call(row.children, function (cell, n) {
        if (n === 0) return;
        cell.addEventListener('mouseenter', function () {
          if (!locked) show(n, false);
        });
        cell.addEventListener('click', function () { show(n, true); });
      });
    });

    wrap.addEventListener('mouseleave', function () {
      if (locked) return;
      resetTimer = window.setTimeout(function () { show(1, false); }, 3000);
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) show(1, false);
        });
      }, { threshold: 0.05 }).observe(wrap);
    }

    show(1, false);
  }

  function init() {
    document.querySelectorAll('[data-sem-carousel]').forEach(setup);
    document.querySelectorAll('.sem-vs-wrap').forEach(setupCompareGlow);
    document.querySelectorAll('.sem-mv-wrap').forEach(setupColumnGlow);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
