/* ── intro overlay — shared flow engine ─────────────────────────
   One flow, three skins. Skin is read from <body data-intro-mode="A|B|C">.
   - once per session (sessionStorage)
   - skip anytime: [SKIP] button, ESC, click the backdrop
   - keyboard: 1-4 select, ESC dismiss
   - prefers-reduced-motion: no typing/glitch, instant text, choices stay
   - logChoice() stubs to console in the demo (real /api/ping wiring is phase 2)
────────────────────────────────────────────────────────────── */
(function () {
  var MODE = (document.body.getAttribute("data-intro-mode") || "B").toUpperCase();
  var SEEN_KEY = "lk_intro_seen";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // DEMO MODE: on localhost the intro replays on every reload so it can be
  // reviewed. In production it shows once per session (the sessionStorage gate).
  var DEMO = /^(localhost|127\.)/.test(location.hostname);

  // hand-authored copy (LK voice: quiet, restrained, a little noir)
  var COPY = {
    boot: ["establishing connection", "secure link open", "ready for input"],
    q1_prompt: "who am i speaking with?",
    q1: [
      { key: "founder",  label: "founder",  sub: "building something" },
      { key: "operator", label: "operator", sub: "running something" },
      { key: "investor", label: "investor", sub: "backing something" },
      { key: "observer", label: "observer", sub: "just looking" }
    ],
    q2_prompt: "what's on your mind?",
    q2: [
      { key: "software",   label: "software",   sub: "that doesn't exist yet" },
      { key: "ai",         label: "private ai",  sub: "i can trust with my data" },
      { key: "automation", label: "automation", sub: "things that run without me" },
      { key: "security",   label: "security",   sub: "who's already inside" }
    ],
    q3_prompt: "where is it?",
    q3: [
      { key: "active",  label: "active",  sub: "costing me now" },
      { key: "forming", label: "forming", sub: "i can feel it coming" },
      { key: "recon",   label: "recon",   sub: "just curious" }
    ],
    readouts: {
      founder:  ["founder, building.", "private software and ai, shaped to what you're making. most of it doesn't exist yet. that's the point."],
      operator: ["operator, running it.", "the work is making it run without you in the loop. that's the whole game."],
      investor: ["investor, backing.", "you need to know what's real under the demo. that's a different kind of audit."],
      observer: ["just looking is allowed.", "the door stays open. take your time."]
    },
    cta: "if this is you",
    cta_link: "open a line",
    inq_label: "for inquiries, leave a line (optional)",
    inq_placeholder: "you@company.com",
    inq_done: "> received. i'll be in touch.",
    skip: "skip"
  };

  var answers = {};
  // share the visit id created by the main tracking snippet so intro rows
  // join the same visitor's story; make our own if we somehow run first.
  function vid() {
    if (!window.__lkvid) window.__lkvid = Math.random().toString(36).slice(2, 8);
    return window.__lkvid;
  }
  function post(payload) {
    payload.vid = vid();
    if (DEMO) { if (window.console) console.log("[intro] →", payload); return; }
    try {
      var data = JSON.stringify(payload);
      var blob = new Blob([data], { type: "application/json" });
      if (!(navigator.sendBeacon && navigator.sendBeacon("/api/ping", blob))) {
        fetch("/api/ping", { method: "POST", headers: { "content-type": "application/json" }, keepalive: true, body: data }).catch(function () {});
      }
    } catch (e) {}
  }
  function logChoice(step, value) {
    answers[step] = value;
    post({ event: "intro:" + step + ":" + value });
  }

  if (!DEMO && sessionStorage.getItem(SEEN_KEY)) return; // once per session (prod)

  // ── build overlay ──
  var root = document.createElement("div");
  root.className = "lk-intro lk-intro-" + MODE;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Welcome. Identify yourself, or skip to enter the site.");
  root.innerHTML =
    '<div class="lk-intro-scan" aria-hidden="true"></div>' +
    '<button class="lk-intro-skip" type="button">' + COPY.skip + ' <span>[esc]</span></button>' +
    '<div class="lk-intro-stage"></div>' +
    '<div class="lk-intro-prog" aria-hidden="true"></div>';
  document.body.appendChild(root);
  document.body.classList.add("lk-intro-open");
  var stage = root.querySelector(".lk-intro-stage");
  var prog = root.querySelector(".lk-intro-prog");

  function dismiss(reason) {
    if (!DEMO) sessionStorage.setItem(SEEN_KEY, "1");
    if (reason) logChoice("exit", reason);
    root.classList.add("lk-intro-out");
    setTimeout(function () {
      root.remove();
      document.body.classList.remove("lk-intro-open");
    }, reduce ? 0 : 420);
  }

  // once the read-out (with its email form) is on screen, stop dismissing on
  // stray backdrop taps / key shortcuts — the user is trying to type, not skip.
  var onReadout = false;
  function typingInField(e) {
    var el = e.target;
    return el && /^(input|textarea|select)$/i.test(el.tagName || "");
  }

  root.querySelector(".lk-intro-skip").addEventListener("click", function () { dismiss("skip"); });
  root.addEventListener("click", function (e) {
    if (onReadout) return;                 // never nuke the form with a stray tap
    if (e.target === root) dismiss("skip");
  });
  document.addEventListener("keydown", function onKey(e) {
    if (!document.body.contains(root)) { document.removeEventListener("keydown", onKey); return; }
    if (typingInField(e)) {                // typing an email — leave keys alone
      if (e.key === "Escape") e.target.blur();
      return;
    }
    if (e.key === "Escape") { dismiss("skip"); return; }
    if (onReadout) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) {
      var btns = stage.querySelectorAll(".lk-choice");
      if (btns[n - 1] && !btns[n - 1].classList.contains("lk-choice-hold")) btns[n - 1].click();
    }
  });

  function setProg(step) { prog.textContent = step ? "0" + step + " / 03" : ""; }

  // typewriter (skipped under reduced-motion) — snappy: a few chars per tick
  function type(el, text, done) {
    if (reduce) { el.textContent = text; done && done(); return; }
    var i = 0, step = text.length > 40 ? 2 : 1;   // longer lines reveal faster
    (function tick() {
      el.textContent = text.slice(0, i);
      if (i <= text.length) { i += step; setTimeout(tick, 16); }
      else done && done();
    })();
  }

  // typed lines that never reflow: the FULL text is always in flow — the
  // typed head is visible, the untyped tail sits in an invisible span — so
  // height/wrapping are final from frame one and nothing is absolutely
  // positioned (an absolute overlay can wrap differently on some phones
  // and spill over the options below).
  function typeLine(el, text, done) {
    el.classList.add("lk-typewrap");
    var head = document.createElement("span");
    var rest = document.createElement("span");
    rest.className = "lk-t-rest";
    rest.setAttribute("aria-hidden", "true");
    el.appendChild(head);
    el.appendChild(rest);
    if (reduce) { head.textContent = text; done && done(); return; }
    var i = 0, step = text.length > 40 ? 2 : 1;
    (function tick() {
      if (i > text.length) i = text.length;
      head.textContent = text.slice(0, i);
      rest.textContent = text.slice(i);
      if (i < text.length) { i += step; setTimeout(tick, 16); }
      else done && done();
    })();
  }

  function clearStage(cb) {
    if (reduce) { stage.innerHTML = ""; cb(); return; }
    stage.classList.add("lk-fade-out");
    setTimeout(function () { stage.innerHTML = ""; stage.classList.remove("lk-fade-out"); cb(); }, 180);
  }

  // ── screens ──
  function boot() {
    setProg(0);
    var pre = document.createElement("div");
    pre.className = "lk-boot";
    stage.appendChild(pre);
    var lines = COPY.boot.slice();
    (function next() {
      if (!lines.length) { setTimeout(function () { clearStage(q1); }, reduce ? 0 : 240); return; }
      var row = document.createElement("div");
      row.className = "lk-boot-line";
      pre.appendChild(row);
      var mk = document.createElement("span");
      mk.className = "lk-boot-mk";
      mk.textContent = "> ";
      row.appendChild(mk);
      var t = document.createElement("span");
      row.appendChild(t);
      type(t, lines.shift(), function () {
        var ok = document.createElement("span");
        ok.className = "lk-boot-ok";
        ok.textContent = " ok";
        row.appendChild(ok);
        setTimeout(next, reduce ? 0 : 90);
      });
    })();
  }

  function question(step, promptText, opts, onPick) {
    setProg(step);
    var wrap = document.createElement("div");
    wrap.className = "lk-q";
    var p = document.createElement("div");
    p.className = "lk-q-prompt";
    wrap.appendChild(p);
    var list = document.createElement("div");
    list.className = "lk-choices";
    wrap.appendChild(list);
    stage.appendChild(wrap);
    // build every option up front, invisible but occupying its final space —
    // the typed prompt can wrap on phones without shoving them around.
    var picked = false;   // one answer per question — ignore double-taps
    var btns = opts.map(function (o, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lk-choice lk-choice-hold";
      b.innerHTML =
        '<span class="lk-choice-n">' + (i + 1) + '</span>' +
        '<span class="lk-choice-l">' + o.label + '</span>' +
        '<span class="lk-choice-s">' + o.sub + '</span>';
      b.addEventListener("click", function () {
        if (picked) return;
        picked = true;
        b.blur();   // don't leave a sticky focus/hover state behind on touch
        logChoice("q" + step, o.key);
        clearStage(function () { onPick(o.key); });
      });
      list.appendChild(b);
      return b;
    });
    typeLine(p, promptText, function () {
      btns.forEach(function (b, i) {
        b.classList.remove("lk-choice-hold");
        if (!reduce) { b.style.animationDelay = (i * 40) + "ms"; b.classList.add("lk-choice-in"); }
      });
    });
  }

  function q1() { question(1, COPY.q1_prompt, COPY.q1, function () { q2(); }); }
  function q2() { question(2, COPY.q2_prompt, COPY.q2, function () { q3(); }); }
  function q3() { question(3, COPY.q3_prompt, COPY.q3, function () { readout(); }); }

  function readout() {
    setProg(0);
    prog.textContent = "";
    onReadout = true;   // stop backdrop/shortcut dismiss — form is coming
    // final segment row carries role/intent/temp so the sheet has clean columns
    post({ event: "intro:done", role: answers.q1 || "", intent: answers.q2 || "", temp: answers.q3 || "" });
    var role = answers.q1 || "observer";
    var lines = COPY.readouts[role] || COPY.readouts.observer;
    var wrap = document.createElement("div");
    wrap.className = "lk-readout";
    stage.appendChild(wrap);
    var l1 = document.createElement("div");
    l1.className = "lk-readout-1";
    var l2 = document.createElement("div");
    l2.className = "lk-readout-2";
    wrap.appendChild(l1); wrap.appendChild(l2);
    // everything below the headline is built now, invisible, in its final
    // spot — the typed headline can never push into or overlap it. Then the
    // sub-line and form fade in, in order.
    l2.textContent = lines[1] || "";
    l2.classList.add("lk-hold");
    buildInquiry(wrap, role);
    var below = wrap.querySelectorAll(".lk-inq, .lk-enter");
    below.forEach(function (el) { el.classList.add("lk-hold"); });
    function reveal() {
      l2.classList.add("lk-reveal");
      setTimeout(function () {
        below.forEach(function (el) { el.classList.add("lk-reveal"); });
        // autofocus on desktop only (avoid a surprise keyboard pop on phones)
        var input = wrap.querySelector(".lk-inq-input");
        if (input && !matchMedia("(pointer: coarse)").matches) { try { input.focus(); } catch (e) {} }
      }, reduce ? 0 : 140);
    }
    if (reduce) { l1.textContent = lines[0]; reveal(); }
    else typeLine(l1, lines[0], reveal);
  }

  function buildInquiry(wrap, role) {
    var box = document.createElement("div");
    box.className = "lk-inq";
    // observer gets a soft one-liner, everyone else gets the optional line-leaver
    if (role === "observer") {
      box.innerHTML = '<a class="lk-cta-link" href="#contact">[ ' + COPY.cta_link + ' ]</a>';
    } else {
      box.innerHTML =
        '<div class="lk-inq-label">' + COPY.inq_label + '</div>' +
        '<form class="lk-inq-form" novalidate>' +
          '<span class="lk-inq-mk">&gt;</span>' +
          '<input class="lk-inq-input" type="email" inputmode="email" autocomplete="email" ' +
            'placeholder="' + COPY.inq_placeholder + '" aria-label="your email, optional" />' +
          '<button class="lk-inq-send" type="submit">send</button>' +
        '</form>' +
        '<div class="lk-inq-msg" role="status"></div>';
    }
    wrap.appendChild(box);

    // the ONLY filled/coral action is "send". Entering the site is a quiet
    // ghost link so nobody mistakes it for the submit and skips by accident.
    var enter = document.createElement("button");
    enter.type = "button";
    enter.className = "lk-enter lk-enter-ghost";
    enter.textContent = (role === "observer") ? "enter site →" : "skip and enter →";
    enter.addEventListener("click", function () { dismiss("complete"); });
    wrap.appendChild(enter);

    var link = box.querySelector(".lk-cta-link");
    if (link) link.addEventListener("click", function () { logChoice("cta", "contact"); dismiss("complete"); });

    var form = box.querySelector(".lk-inq-form");
    if (form) {
      var input = form.querySelector(".lk-inq-input");
      var msg = box.querySelector(".lk-inq-msg");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = (input.value || "").trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          msg.textContent = "> that address doesn't parse.";
          msg.className = "lk-inq-msg lk-inq-err";
          input.focus();
          return;
        }
        post({ event: "inquiry", email: email, role: answers.q1 || "", intent: answers.q2 || "", temp: answers.q3 || "" });
        box.innerHTML = '<div class="lk-inq-done">' + COPY.inq_done + '</div>';
        enter.textContent = "enter site →";
      });
    }
  }

  // dev-jump (localhost only): ?jump=readout renders the read-out form directly
  if (DEMO && /jump=readout/.test(location.search)) {
    answers.q1 = "founder"; answers.q2 = "software"; answers.q3 = "active";
    readout();
    return;
  }

  // honest preloader: let the sphere/fonts settle a beat, then boot
  setTimeout(boot, reduce ? 0 : 160);
})();
