/* ── experimental: occasional premium micro-glitch ─────────────
   Variants:
     sliceGlitch   — coral+ice RGB-split clones with random clip bands
     tearBand      — CRT tear: full-width band, backdrop hue-shift + x-jitter
     scramble      — plain-text el cycles random glyphs before settling
     scanline      — thin coral light-line sweeps the viewport
     wordVibrate   — a random word in running text jitters, then settles
     redact        — a random word turns ▓▓▓▓, then declassifies
     sphereGlitch  — the ball takes a visual hit AND spin-jolts (weighted:
                     dominates bursts while the sphere is on screen)
     corruptStatus — the FPS/dims HUD readout corrupts a couple chars
   Ambient:
     decrypt-on-reveal — §headers scramble-resolve when first scrolled into view
     cursor trace      — phosphor-decay dots behind fast pointer moves (desktop)
   Triggers:
     - SIGNATURE burst, once, the first time you scroll off the hero
     - weighted rotating variants after each scroll burst ends
     - idle heartbeat (demo cadence)
   Respects prefers-reduced-motion. */

(function () {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var COLORS = ["#f0a896", "rgba(150,220,255,0.85)"];
  var GLYPHS = "!<>-_\\/[]{}—=+*^?#________";

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).opacity > 0.3;
  }

  /* overlays are fixed to screen coords — but their SOURCE elements move
     (page scroll AND the hero-collapse transform/fade), so each ghost
     watches its own source every frame and dies the instant the source
     drifts >8px or fades out. Decorative overlays (tears) pass src=null
     and just die on any scroll. */
  var liveOverlays = [];
  function trackOverlay(el, anim, src) {
    var entry = { el: el, anim: anim, src: src || null, spawnY: scrollY };
    if (src) {
      var r = src.getBoundingClientRect();
      entry.spawnLeft = r.left;
      entry.spawnTop = r.top;
    }
    liveOverlays.push(entry);
    anim.onfinish = function () {
      el.remove();
      var i = liveOverlays.indexOf(entry);
      if (i > -1) liveOverlays.splice(i, 1);
    };
  }
  function killOverlay(i) {
    var o = liveOverlays[i];
    o.anim.cancel();
    o.el.remove();
    liveOverlays.splice(i, 1);
  }
  (function watchOverlays() {
    for (var i = liveOverlays.length - 1; i >= 0; i--) {
      var o = liveOverlays[i];
      if (!o.src) {
        if (Math.abs(scrollY - o.spawnY) > 20) killOverlay(i);
        continue;
      }
      var r = o.src.getBoundingClientRect();
      if (Math.abs(r.left - o.spawnLeft) > 8 || Math.abs(r.top - o.spawnTop) > 8 ||
          parseFloat(getComputedStyle(o.src).opacity) < 0.35) {
        killOverlay(i);
      }
    }
    requestAnimationFrame(watchOverlays);
  })();

  function targets() {
    var els = [];
    [".mark", "#bigClock"].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (visible(el)) els.push(el);
    });
    document.querySelectorAll(".ar-h, .ar-num").forEach(function (h) {
      if (visible(h)) els.push(h);
    });
    return els;
  }

  /* plain-text elements safe for scramble (no child markup to destroy).
     NO #bigClock — glyphs have wild widths in the display font, and the
     bottom-anchored meta-stack grows UPWARD into the mark when it reflows. */
  function scrambleTargets() {
    var els = [];
    document.querySelectorAll(".ar-num, .ar-cell-k, .ar-li-n").forEach(function (el) {
      if (visible(el) && el.children.length === 0) els.push(el);
    });
    return els;
  }

  /* ── variant: RGB-split slice glitch ── */
  function sliceGlitch(el, strong) {
    if (!el) return;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0) return;

    COLORS.forEach(function (color, i) {
      var c = el.cloneNode(true);
      var s = c.style;
      s.position = "fixed";
      s.left = rect.left + "px";
      s.top = rect.top + "px";
      s.width = rect.width + "px";
      s.height = rect.height + "px";
      s.margin = "0";
      s.pointerEvents = "none";
      s.zIndex = 9999;
      s.color = color;
      s.webkitTextFillColor = color;
      s.opacity = "0.9";
      s.mixBlendMode = "screen";
      document.body.appendChild(c);

      var dir = i === 0 ? -1 : 1;
      var amp = strong ? 10 : 5;
      var frames = [];
      for (var f = 0; f < (strong ? 9 : 6); f++) {
        var a = Math.random() * 70;
        frames.push({
          transform: "translate(" + dir * (2 + Math.random() * amp) + "px," + (Math.random() * 4 - 2) + "px)",
          clipPath: "inset(" + a + "% 0 " + Math.max(0, 100 - a - (8 + Math.random() * 22)) + "% 0)",
          offset: f / (strong ? 8 : 5)
        });
      }
      var anim = c.animate(frames, { duration: (strong ? 420 : 240) + Math.random() * 120, easing: "steps(" + (strong ? 8 : 5) + ", jump-none)" });
      trackOverlay(c, anim, el);
    });

    el.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(2px,-1px) skewX(1.5deg)" },
        { transform: "translate(-2px,1px)" },
        { transform: "translate(0,0)" }
      ],
      { duration: strong ? 320 : 200, easing: "steps(3, jump-none)" }
    );
  }

  /* ── variant: CRT tear band ── */
  function tearBand() {
    var d = document.createElement("div");
    var h = 24 + Math.random() * 60;
    var top = Math.random() * (innerHeight - h);
    var s = d.style;
    s.position = "fixed";
    s.left = "-4%"; s.width = "108%";
    s.top = top + "px";
    s.height = h + "px";
    s.zIndex = 9998;
    s.pointerEvents = "none";
    s.backdropFilter = "hue-rotate(150deg) saturate(1.6) contrast(1.15)";
    s.webkitBackdropFilter = s.backdropFilter;
    document.body.appendChild(d);
    var anim = d.animate(
      [
        { transform: "translateX(0)", opacity: 1 },
        { transform: "translateX(-14px)", opacity: 1 },
        { transform: "translateX(9px)", opacity: 1 },
        { transform: "translateX(0)", opacity: 0 }
      ],
      { duration: 260 + Math.random() * 140, easing: "steps(4, jump-none)" }
    );
    trackOverlay(d, anim);
  }

  /* ── variant: glyph scramble on a plain-text element ── */
  function scramble(el) {
    if (!el || el.dataset.fx) return;
    var original = el.textContent;
    el.dataset.fx = "1";
    var steps = 7, i = 0;
    var iv = setInterval(function () {
      i++;
      if (i >= steps) {
        clearInterval(iv);
        el.textContent = original;
        delete el.dataset.fx;
        return;
      }
      var out = "";
      for (var k = 0; k < original.length; k++) {
        out += (k / original.length < i / steps || original[k] === " ")
          ? original[k]
          : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
    }, 42);
  }

  /* ── ambient: decrypt-on-reveal — markup-safe scramble that resolves a
     section header as it first enters the viewport ── */
  function scrambleRich(el) {
    if (el.dataset.fx) return;
    el.dataset.fx = "1";
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [], n;
    while ((n = walker.nextNode())) { if (n.textContent.trim()) nodes.push({ node: n, orig: n.textContent }); }
    if (!nodes.length) { delete el.dataset.fx; return; }
    var steps = 10, i = 0;
    var iv = setInterval(function () {
      i++;
      var done = i >= steps;
      nodes.forEach(function (e) {
        if (done) { e.node.textContent = e.orig; return; }
        var out = "";
        for (var k = 0; k < e.orig.length; k++) {
          out += (k / e.orig.length < i / steps || e.orig[k] === " ")
            ? e.orig[k]
            : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        e.node.textContent = out;
      });
      if (done) { clearInterval(iv); delete el.dataset.fx; }
    }, 46);
  }
  var revealIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting && !e.target.dataset.decrypted) {
        e.target.dataset.decrypted = "1";
        scrambleRich(e.target);
        revealIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll(".ar-h").forEach(function (el) { revealIO.observe(el); });

  /* ── variant: scanline sweep ── */
  function scanline() {
    var d = document.createElement("div");
    var s = d.style;
    s.position = "fixed";
    s.left = 0; s.right = 0; s.top = 0;
    s.height = "2px";
    s.zIndex = 9998;
    s.pointerEvents = "none";
    s.background = "linear-gradient(90deg, transparent, rgba(240,168,150,0.55), rgba(236,230,213,0.35), transparent)";
    s.boxShadow = "0 0 14px rgba(240,168,150,0.35)";
    document.body.appendChild(d);
    d.animate(
      [{ transform: "translateY(0)", opacity: 0.9 }, { transform: "translateY(" + innerHeight + "px)", opacity: 0.4 }],
      { duration: 560, easing: "cubic-bezier(.2,.6,.3,1)" }
    ).onfinish = function () { d.remove(); };
  }

  /* ── shared: wrap a random 4+ letter word from visible running text ── */
  function wrapRandomWord() {
    var containers = [];
    document.querySelectorAll(".ar-prose, .ar-cell li, .ar-li-t, .hero-sentence, .bottom-line").forEach(function (el) {
      if (visible(el) && !el.dataset.fx) containers.push(el);
    });
    if (!containers.length) return null;
    var host = pick(containers);

    var walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    var nodes = [], n;
    while ((n = walker.nextNode())) { if (n.textContent.trim().length > 8) nodes.push(n); }
    if (!nodes.length) return null;
    var node = pick(nodes);

    var words = [], re = /[A-Za-zÀ-ž''-]{4,}/g, m;
    while ((m = re.exec(node.textContent))) words.push(m);
    if (!words.length) return null;
    var w = pick(words);

    var range = document.createRange();
    range.setStart(node, w.index);
    range.setEnd(node, w.index + w[0].length);
    var span = document.createElement("span");
    span.style.display = "inline-block";
    try { range.surroundContents(span); } catch (e) { return null; }
    host.dataset.fx = "1";
    return { span: span, word: w[0], host: host };
  }
  function unwrap(hit) {
    var parent = hit.span.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(hit.word), hit.span);
      parent.normalize();
    }
    delete hit.host.dataset.fx;
  }

  /* ── variant: word vibrate ── */
  function wordVibrate() {
    var hit = wrapRandomWord();
    if (!hit) return false;
    var frames = [];
    var steps = 8;
    for (var f = 0; f <= steps; f++) {
      var last = f === steps;
      frames.push({
        transform: last ? "translate(0,0)" : "translate(" + (Math.random() * 5 - 2.5) + "px," + (Math.random() * 3 - 1.5) + "px) skewX(" + (Math.random() * 6 - 3) + "deg)",
        textShadow: last ? "none" : (Math.random() < 0.5
          ? "-2px 0 " + COLORS[0] + ", 2px 0 " + COLORS[1]
          : "2px 0 " + COLORS[0] + ", -2px 0 " + COLORS[1]),
        offset: f / steps
      });
    }
    hit.span.animate(frames, { duration: 380 + Math.random() * 220, easing: "steps(" + steps + ", jump-none)" })
      .onfinish = function () { unwrap(hit); };
    return true;
  }

  /* ── variant: redacted flash — word turns ▓▓▓▓, then declassifies ── */
  function redact() {
    var hit = wrapRandomWord();
    if (!hit) return false;
    var blocks = "";
    for (var i = 0; i < hit.word.length; i++) blocks += "▓";
    // lock the span to the word's width — ▓ has a different advance width,
    // and any reflow makes the bottom-anchored hero stack jump upward
    hit.span.style.width = hit.span.getBoundingClientRect().width + "px";
    hit.span.style.overflow = "hidden";
    hit.span.style.verticalAlign = "bottom";
    hit.span.style.color = COLORS[0];
    hit.span.style.opacity = "0.85";
    hit.span.textContent = blocks;
    setTimeout(function () {
      // declassify: brief scramble-settle back to the real word
      var steps = 5, i = 0;
      var iv = setInterval(function () {
        i++;
        if (i >= steps) {
          clearInterval(iv);
          hit.span.textContent = hit.word;
          unwrap(hit);
          return;
        }
        var out = "";
        for (var k = 0; k < hit.word.length; k++) {
          out += (k / hit.word.length < i / steps) ? hit.word[k] : "▓";
        }
        hit.span.textContent = out;
      }, 48);
    }, 320 + Math.random() * 260);
    return true;
  }

  /* ── variant: static noise flash — a breath of analog snow over the page ── */
  var NOISE_URI = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.9'/%3E%3C/svg%3E\")";
  function noiseFlash() {
    var d = document.createElement("div");
    var s = d.style;
    s.position = "fixed";
    s.inset = "0";
    s.zIndex = 9998;
    s.pointerEvents = "none";
    s.backgroundImage = NOISE_URI;
    s.mixBlendMode = "screen";
    s.opacity = "0";
    document.body.appendChild(d);
    d.animate(
      [
        { opacity: 0, backgroundPosition: "0 0" },
        { opacity: 0.14, backgroundPosition: "-60px 40px" },
        { opacity: 0.08, backgroundPosition: "80px -30px" },
        { opacity: 0, backgroundPosition: "0 0" }
      ],
      { duration: 200 + Math.random() * 120, easing: "steps(3, jump-none)" }
    ).onfinish = function () { d.remove(); };
  }

  /* ── variant: chromatic page pulse — one-beat hue jolt of everything ── */
  function chromaPulse() {
    var d = document.createElement("div");
    var s = d.style;
    s.position = "fixed";
    s.inset = "0";
    s.zIndex = 9998;
    s.pointerEvents = "none";
    s.backdropFilter = "hue-rotate(120deg) saturate(1.5)";
    s.webkitBackdropFilter = s.backdropFilter;
    document.body.appendChild(d);
    d.animate(
      [{ opacity: 1 }, { opacity: 1 }, { opacity: 0 }],
      { duration: 150 + Math.random() * 90, easing: "steps(2, jump-none)" }
    ).onfinish = function () { d.remove(); };
  }

  /* ── variant: terminal cursor — a coral block cursor blinks after a
     visible header, like something is about to type ── */
  function cursorBlink() {
    var t = targets().filter(function (el) { return el.matches && el.matches(".ar-h"); });
    if (!t.length) return false;
    var el = pick(t);
    var c = document.createElement("span");
    c.textContent = "▌";
    c.style.color = COLORS[0];
    c.style.marginLeft = "0.15em";
    el.appendChild(c);
    var blinks = 0;
    var iv = setInterval(function () {
      blinks++;
      c.style.opacity = blinks % 2 ? "0" : "1";
      if (blinks >= 6) { clearInterval(iv); c.remove(); }
    }, 160);
    return true;
  }

  /* ── variant: sphere glitch — the ball takes a visual hit AND spin-jolts ── */
  function sphereGlitch(strong) {
    var cv = document.getElementById("cubes");
    if (!cv || !visible(cv)) return false;
    if (window.__sphereJolt) window.__sphereJolt(strong ? 4.5 : 2.4 + Math.random() * 1.6);
    var steps = strong ? 9 : 7;
    var frames = [];
    for (var f = 0; f <= steps; f++) {
      var last = f === steps;
      frames.push({
        transform: last ? "none" : "translate(" + (Math.random() * 8 - 4) + "px," + (Math.random() * 6 - 3) + "px)",
        filter: last ? "none" : (Math.random() < 0.55
          ? "drop-shadow(" + (2 + Math.random() * 3) + "px 0 rgba(240,168,150,0.7)) drop-shadow(-" + (2 + Math.random() * 3) + "px 0 rgba(150,220,255,0.55))"
          : "hue-rotate(" + (120 + Math.random() * 140) + "deg) saturate(1.8)"),
        clipPath: (!last && Math.random() < 0.3)
          ? "inset(" + Math.random() * 25 + "% 0 " + Math.random() * 25 + "% 0)"
          : "inset(0 0 0 0)",
        offset: f / steps
      });
    }
    cv.animate(frames, { duration: (strong ? 460 : 320) + Math.random() * 140, easing: "steps(" + steps + ", jump-none)" });
    // the hit knocks a few dots into dark-matter anomalies
    if (window.__sphereAnomaly) {
      var k = strong ? 3 : 1 + Math.floor(Math.random() * 2);
      for (var j = 0; j < k; j++) setTimeout(window.__sphereAnomaly, j * 90);
    }
    return true;
  }

  /* ── variant: HUD corruption — FPS/dims readout corrupts briefly ── */
  function corruptStatus() {
    var els = [document.getElementById("fps"), document.getElementById("pxDim")].filter(function (el) { return el && visible(el) && !el.dataset.fx; });
    if (!els.length) return false;
    var el = pick(els);
    var orig = el.textContent;
    el.dataset.fx = "1";
    // width-lock so glyph swaps can't reflow the hero stack
    el.style.display = "inline-block";
    el.style.width = el.getBoundingClientRect().width + "px";
    var chars = orig.split("");
    var GL = "∅₽▓#!<>_";
    for (var i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      var k = Math.floor(Math.random() * chars.length);
      if (chars[k] !== " ") chars[k] = GL[Math.floor(Math.random() * GL.length)];
    }
    el.textContent = chars.join("");
    setTimeout(function () {
      el.textContent = orig;
      el.style.display = "";
      el.style.width = "";
      delete el.dataset.fx;
    }, 220 + Math.random() * 200);
    return true;
  }

  /* ── ambient: cursor phosphor trace (fine pointers, fast moves only) ── */
  if (matchMedia("(pointer: fine)").matches) {
    var lastTrace = 0, lx = 0, ly = 0;
    addEventListener("pointermove", function (e) {
      var now = performance.now();
      var speed = Math.hypot(e.clientX - lx, e.clientY - ly);
      lx = e.clientX; ly = e.clientY;
      if (now - lastTrace < 30 || speed < 20) return;
      lastTrace = now;
      var d = document.createElement("div");
      var s = d.style;
      s.position = "fixed";
      s.left = (e.clientX - 2) + "px";
      s.top = (e.clientY - 2) + "px";
      s.width = "4px"; s.height = "4px";
      s.borderRadius = "50%";
      s.background = COLORS[0];
      s.boxShadow = "0 0 6px rgba(240,168,150,0.7)";
      s.zIndex = 9997;
      s.pointerEvents = "none";
      document.body.appendChild(d);
      d.animate(
        [{ opacity: 0.5, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.3)" }],
        { duration: 420, easing: "linear" }
      ).onfinish = function () { d.remove(); };
    }, { passive: true });
  }

  /* ── ambient sphere life — its own 6–12s timer, independent of scroll
     bursts. Random personality each time, never the same twice in a row. ── */
  function phaseShift(cv) {
    // the ball phases half out of existence and re-materializes
    cv.animate(
      [
        { filter: "none", opacity: 1 },
        { filter: "blur(5px) saturate(0.6)", opacity: 0.45, offset: 0.35 },
        { filter: "blur(1px)", opacity: 0.85, offset: 0.6 },
        { filter: "blur(3px) saturate(0.7)", opacity: 0.6, offset: 0.75 },
        { filter: "none", opacity: 1 }
      ],
      { duration: 1100 + Math.random() * 400, easing: "ease-in-out" }
    );
  }
  function chromaBreathe(cv) {
    // slow hue drift out and back — like the signal detuning
    cv.animate(
      [
        { filter: "none" },
        { filter: "hue-rotate(" + (40 + Math.random() * 50) + "deg) saturate(1.4)", offset: 0.5 },
        { filter: "none" }
      ],
      { duration: 1600 + Math.random() * 600, easing: "ease-in-out" }
    );
  }
  var lastSphereFx = -1;
  (function sphereAmbient() {
    setTimeout(function () {
      var cv = document.getElementById("cubes");
      if (cv && visible(cv)) {
        var fx = [
          function () { sphereGlitch(false); },                                   // glitch flicker
          function () { phaseShift(cv); },                                        // phase out/in
          function () { if (window.__sphereWave) window.__sphereWave(); },        // ripple wave
          function () { if (window.__sphereJolt) window.__sphereJolt(2 + Math.random() * 1.5); }, // spin kick
          function () { for (var j = 0; j < 4; j++) setTimeout(window.__sphereAnomaly, j * 130); }, // dark cluster
          function () { chromaBreathe(cv); },                                     // hue detune
          function () { phaseShift(cv); if (window.__sphereWave) setTimeout(window.__sphereWave, 300); } // phase + wave
        ];
        var i;
        do { i = Math.floor(Math.random() * fx.length); } while (i === lastSphereFx);
        lastSphereFx = i;
        fx[i]();
      }
      sphereAmbient();
    }, 6000 + Math.random() * 6000);
  })();

  /* ── weighted burst — sphere glitch dominates while the ball is on screen ── */
  var lastVariant = -1;
  function burst() {
    var cubes = document.getElementById("cubes");
    // near the hero: the ball takes ~45% of all bursts
    if (cubes && visible(cubes) && Math.random() < 0.45) {
      lastVariant = -1;
      sphereGlitch(false);
      if (Math.random() < 0.4) scanline();
      if (Math.random() < 0.3) corruptStatus();
      return;
    }
    var VARIANTS = [
      function () { sliceGlitch(pick(targets()), false); },
      function () { tearBand(); if (Math.random() < 0.5) tearBand(); },
      function () { var t = scrambleTargets(); if (t.length) scramble(pick(t)); else sliceGlitch(pick(targets()), false); },
      function () { scanline(); sliceGlitch(pick(targets()), false); },
      function () { if (!wordVibrate()) sliceGlitch(pick(targets()), false); },
      function () { wordVibrate(); setTimeout(wordVibrate, 160); },
      function () { if (!redact()) wordVibrate(); },
      function () { if (!corruptStatus()) { var t = scrambleTargets(); if (t.length) scramble(pick(t)); } },
      function () { noiseFlash(); if (Math.random() < 0.4) wordVibrate(); },
      function () { chromaPulse(); if (Math.random() < 0.5) tearBand(); },
      function () { if (!cursorBlink()) { noiseFlash(); } }
    ];
    var i;
    do { i = Math.floor(Math.random() * VARIANTS.length); } while (i === lastVariant);
    lastVariant = i;
    VARIANTS[i]();
    if (Math.random() < 0.25) setTimeout(function () { sliceGlitch(pick(targets()), false); }, 130);
  }

  /* ── SIGNATURE burst — once, first scroll off the hero ── */
  var signatureDone = false;
  function signature() {
    signatureDone = true;
    sphereGlitch(true);
    targets().forEach(function (el, i) {
      setTimeout(function () { sliceGlitch(el, true); }, i * 60);
    });
    tearBand();
    setTimeout(tearBand, 140);
    setTimeout(scanline, 80);
    scrambleTargets().slice(0, 3).forEach(function (el, i) {
      setTimeout(function () { scramble(el); }, 100 + i * 90);
    });
    setTimeout(wordVibrate, 180);
    setTimeout(redact, 340);
    corruptStatus();
    noiseFlash();
    setTimeout(chromaPulse, 200);
  }

  /* trigger 0: signature on first scroll past the hero */
  addEventListener("scroll", function onFirst() {
    if (signatureDone) { removeEventListener("scroll", onFirst); return; }
    if (scrollY > innerHeight * 0.35) {
      removeEventListener("scroll", onFirst);
      signature();
      lastFire = Date.now();
    }
  }, { passive: true });

  /* trigger 1: weighted variant just after a scroll burst ends */
  var scrollTimer = 0, lastFire = 0;
  addEventListener("scroll", function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      if (!signatureDone || Date.now() - lastFire < 5000) return;
      if (Math.random() < 0.45) { lastFire = Date.now(); burst(); }
    }, 150);
  }, { passive: true });

  /* trigger 2: idle heartbeat */
  (function idle() {
    setTimeout(function () {
      if (signatureDone && Date.now() - lastFire > 3000) { lastFire = Date.now(); burst(); }
      idle();
    }, 14000 + Math.random() * 11000);
  })();
})();
