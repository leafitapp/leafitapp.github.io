(() => {
  const root = document.documentElement;
  const DICT = window.LEAFIT_I18N || {};
  const t = str => DICT[str] || str;
  const LANG = (root.lang || "en").slice(0, 2);
  const LOCALE = LANG === "uk" ? "uk-UA" : LANG === "ru" ? "ru-RU" : "en-GB";
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(hover: none)").matches;
  const EASE = "cubic-bezier(.2,.8,.2,1)";
  const EMPH = "cubic-bezier(.05,.7,.1,1)";
  const SPRING = "cubic-bezier(.34,1.4,.64,1)";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const buzzy = ms => { if (touch && navigator.vibrate) navigator.vibrate(ms); };

  const snackEl = $(".snack");
  let snackTimer = 0;
  const snack = msg => {
    snackEl.textContent = msg;
    snackEl.classList.remove("show");
    void snackEl.offsetWidth;
    snackEl.classList.add("show");
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => snackEl.classList.remove("show"), 2600);
  };

  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : dark.matches;
  const segButtons = $$(".seg button");
  const themeBtn = $("#theme");
  const paint = () => {
    $$('meta[name="theme-color"]').forEach(m => m.content = isDark() ? "#111412" : "#F5FBF6");
    const mode = root.dataset.theme || "system";
    segButtons.forEach(b => b.setAttribute("aria-pressed", b.dataset.set === mode));
  };
  const applyTheme = mode => {
    if (mode === "system") delete root.dataset.theme;
    else root.dataset.theme = mode;
    try {
      if (mode === "system") localStorage.removeItem("leafit-theme");
      else localStorage.setItem("leafit-theme", mode);
    } catch (e) {}
    paint();
  };
  const setTheme = (mode, origin) => {
    const before = isDark();
    const willDark = mode === "system" ? dark.matches : mode === "dark";
    themeBtn.classList.remove("spin");
    void themeBtn.offsetWidth;
    themeBtn.classList.add("spin");
    if (calm || !document.startViewTransition || before === willDark) return applyTheme(mode);
    const r = origin ? origin.getBoundingClientRect() : { left: innerWidth / 2, top: 0, width: 0, height: 0 };
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add("vt");
    const t = document.startViewTransition(() => applyTheme(mode));
    t.ready.then(() => {
      root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] }, { duration: 650, easing: EMPH, pseudoElement: "::view-transition-new(root)" });
    });
    t.finished.finally(() => root.classList.remove("vt"));
  };
  themeBtn.addEventListener("click", () => setTheme(isDark() ? "light" : "dark", themeBtn));
  segButtons.forEach(b => b.addEventListener("click", () => setTheme(b.dataset.set, b)));
  dark.addEventListener("change", paint);
  paint();

  const fmtSize = bytes => Math.round(bytes / 1e6) + " MB";
  const fmtCount = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);
  let lastRelease = null;
  const applyRelease = r => {
    lastRelease = r;
    const set = (key, fn) => $$(`[data-gh="${key}"]`).forEach(fn);
    set("short", el => { el.textContent = r.short; });
    set("name", el => { el.textContent = "Leafit " + r.version; });
    set("date", el => { el.textContent = t("Released") + " " + r.date; });
    if (r.size) set("size", el => { el.textContent = " · " + fmtSize(r.size); });
    if (r.apk) set("apk", el => { el.href = r.apk; });
    if (r.downloads > 0) set("downloads", el => { el.textContent = t("{n} downloads").replace("{n}", fmtCount(r.downloads)); el.hidden = false; });
  };
  const loadRelease = async () => {
    const key = "leafit-release-3-" + LANG;
    try {
      const cached = JSON.parse(sessionStorage.getItem(key) || "null");
      if (cached && Date.now() - cached.at < 3600000) return applyRelease(cached);
    } catch (e) {}
    try {
      const res = await fetch("https://api.github.com/repos/So1uv/Leafit/releases?per_page=100", { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) return;
      const list = await res.json();
      const latest = list.find(x => !x.draft && !x.prerelease);
      if (!latest) return;
      const version = (latest.tag_name || "").replace(/^[^0-9]*/, "") || latest.tag_name;
      const apk = (latest.assets || []).find(a => /\.apk$/i.test(a.name));
      const downloads = list.reduce((sum, rel) => sum + (rel.assets || []).reduce((s, a) => s + (a.download_count || 0), 0), 0);
      const r = {
        at: Date.now(),
        version,
        short: version.replace(/\.0$/, ""),
        date: new Date(latest.published_at).toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" }),
        size: apk ? apk.size : 0,
        apk: apk ? apk.browser_download_url : "",
        downloads,
        notes: latest.body || "",
        url: latest.html_url || ""
      };
      try { sessionStorage.setItem(key, JSON.stringify(r)); } catch (e) {}
      applyRelease(r);
    } catch (e) {}
  };
  const releaseReady = loadRelease();

  const NS = "http://www.w3.org/2000/svg";
  let waveId = 0;
  class Wave {
    constructor(svg, opts) {
      const el = document.createElement("div");
      el.className = svg.getAttribute("class");
      el.setAttribute("aria-hidden", "true");
      svg.replaceWith(el);
      this.el = el;
      this.o = opts;
      this.value = 0;
      el.style.setProperty("--sw", opts.sw + "px");
      el.innerHTML = '<svg class="wt"><path class="t"/><circle class="s"/></svg><div class="wclip"><div class="wamp"><svg class="wmove"><path class="w"/></svg></div></div>';
      this.track = el.querySelector(".t");
      this.stop = el.querySelector(".s");
      this.trackSvg = el.querySelector(".wt");
      this.clip = el.querySelector(".wclip");
      this.ampEl = el.querySelector(".wamp");
      this.moveSvg = el.querySelector(".wmove");
      this.wave = el.querySelector(".w");
      this.build();
    }
    build() {
      const W = Math.max(1, this.el.clientWidth);
      const H = Math.max(1, this.el.clientHeight);
      const { wl, amp } = this.o;
      const c = H / 2;
      this.W = W;
      this.c = c;
      const MW = Math.ceil(W + wl * 2);
      this.el.style.setProperty("--wl", wl + "px");
      this.ampEl.style.width = MW + "px";
      this.moveSvg.setAttribute("viewBox", "0 0 " + MW + " " + H);
      this.moveSvg.style.width = MW + "px";
      this.trackSvg.setAttribute("viewBox", "0 0 " + W + " " + H);
      const pts = [];
      for (let x = 0; x <= MW; x += 1.5) pts.push(x.toFixed(1) + "," + (c + amp * Math.sin((x / wl) * Math.PI * 2)).toFixed(2));
      this.wave.setAttribute("d", "M" + pts.join("L"));
      this.render();
    }
    render() {
      const sw = this.o.sw;
      const end = this.o.track ? this.W - sw : this.W;
      const p = Math.max(0, Math.min(1, this.value));
      const px = p * end;
      this.clip.style.width = px.toFixed(1) + "px";
      if (this.o.track) {
        const from = Math.min(end, px + sw * 2);
        this.track.setAttribute("d", from < end - sw ? "M" + from.toFixed(1) + " " + this.c + "H" + (end - sw).toFixed(1) : "");
        this.stop.setAttribute("cx", end.toFixed(1));
        this.stop.setAttribute("cy", this.c);
        this.stop.setAttribute("r", (sw / 2).toFixed(1));
        this.stop.style.opacity = p > 0.985 ? 0 : 1;
      }
    }
    set(v) { this.value = v; this.render(); }
    tween(to, dur = 1400) {
      if (calm) return this.set(to);
      const from = this.value;
      const start = performance.now();
      const step = now => {
        const t = Math.min(1, (now - start) / dur);
        const e = 1 - Math.pow(1 - t, 3);
        this.set(from + (to - from) * e);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    setAmp(a) { this.ampEl.style.setProperty("--amp", a); }
  }
  const small = () => innerWidth < 720;
  const waves = [];
  const mkWave = (svg, opts) => { const w = new Wave(svg, opts); waves.push(w); return w; };
  const progressWave = mkWave($(".progress .wv"), { wl: small() ? 22 : 28, amp: 2.4, sw: 3, track: true });
    const headWaves = $$(".wv.wave").map(svg => mkWave(svg, { wl: 18, amp: 3, sw: 3.5, track: false }));
  const liveWave = $(".wv.wavy") ? mkWave($(".wv.wavy"), { wl: small() ? 24 : 30, amp: 3.6, sw: 5, track: true }) : null;
  let resizeT = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      progressWave.o.wl = small() ? 22 : 28;
      if (liveWave) liveWave.o.wl = small() ? 24 : 30;
      waves.forEach(w => w.build());
    }, 120);
  });

  const bar = $(".bar");
  const hero = $(".hero");
  const dock = $(".dock");
  const spyTargets = ["spaces", "training", "sleep", "privacy", "faq", "get"].map(id => document.getElementById(id)).filter(Boolean);
  const spyLinks = $$("[data-spy]");
  let lastY = scrollY;
  let ticking = false;
  let idleT = 0;
  let dockT = 0;
  let current = "";
  let docMax = 1, heroEnd = 0, spyTops = [];
  const measure = () => {
    docMax = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    heroEnd = hero.offsetTop + hero.offsetHeight - 120;
    spyTops = spyTargets.map(t => [t.id, t.getBoundingClientRect().top + scrollY]);
  };
  measure();
  addEventListener("resize", measure);
  addEventListener("load", measure);
  if ("ResizeObserver" in window) new ResizeObserver(() => measure()).observe(document.body);
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      const dy = y - lastY;
      const p = Math.min(1, y / docMax);
      if ((y > 8) !== bar.classList.contains("scrolled")) bar.classList.toggle("scrolled", y > 8);
      progressWave.set(p);
      progressWave.setAmp(p > 0.995 ? 0 : 1);
      clearTimeout(idleT);
      idleT = setTimeout(() => progressWave.setAmp(p > 0.995 ? 0 : 0.35), 650);
      if (y < heroEnd || p > 0.985) {
        clearTimeout(dockT);
        dock.classList.toggle("show", y >= heroEnd);
      } else if (dy > 6) {
        clearTimeout(dockT);
        dock.classList.remove("show");
        dockT = setTimeout(() => { if (scrollY >= heroEnd) dock.classList.add("show"); }, 900);
      } else if (dy < -6) {
        clearTimeout(dockT);
        dock.classList.add("show");
      }
      let active = "";
      const line = y + innerHeight * 0.38;
      for (const [id, top] of spyTops) if (top <= line) active = id;
      if (p > 0.985) active = "get";
      if (active !== current) {
        current = active;
        spyLinks.forEach(a => a.classList.toggle("on", a.dataset.spy === active));
      }
      lastY = y;
      ticking = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  progressWave.setAmp(0.35);

  const ripple = e => {
    if (e.button > 0) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement("span");
    s.className = "rip";
    s.style.width = s.style.height = d + "px";
    s.style.left = (e.clientX - r.left - d / 2) + "px";
    s.style.top = (e.clientY - r.top - d / 2) + "px";
    el.appendChild(s);
    const end = () => s.classList.add("out");
    el.addEventListener("pointerup", end, { once: true });
    el.addEventListener("pointerleave", end, { once: true });
    el.addEventListener("pointercancel", end, { once: true });
    setTimeout(() => s.remove(), 1400);
  };
  if (!calm) $$(".btn, .icon-btn, .seg button, .tabs button, .chip-new, summary, .nav a, .list-mock li, .pick button, .sb, .pour button").forEach(el => el.addEventListener("pointerdown", ripple));

  const strip = $(".tabs");
  const ind = $(".ind", strip);
  const tabs = $$('[role="tab"]', strip);
  const panelsWrap = document.createElement("div");
  panelsWrap.className = "panels";
  const panelEls = tabs.map(t => document.getElementById(t.getAttribute("aria-controls")));
  panelEls[0].before(panelsWrap);
  panelEls.forEach(p => panelsWrap.appendChild(p));
  const moveInd = (tab, instant) => {
    if (instant) ind.style.transition = "none";
    ind.style.width = tab.offsetWidth + "px";
    ind.style.transform = `translateX(${tab.offsetLeft}px)`;
    if (instant) { void ind.offsetWidth; ind.style.transition = ""; }
  };
  let curTab = 0;
  const select = (idx, focus) => {
    if (idx === curTab) return;
    const dir = idx > curTab ? 1 : -1;
    const h0 = panelsWrap.offsetHeight;
    tabs.forEach((t, i) => {
      const on = i === idx;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      panelEls[i].hidden = !on;
    });
    const panel = panelEls[idx];
    panel.style.setProperty("--dx", dir * (small() ? 36 : 56) + "px");
    panel.classList.remove("enter");
    void panel.offsetWidth;
    panel.classList.add("enter");
    curTab = idx;
    const tab = tabs[idx];
    moveInd(tab);
    strip.scrollTo({ left: tab.offsetLeft - strip.clientWidth / 2 + tab.clientWidth / 2, behavior: calm ? "auto" : "smooth" });
    if (!calm && panelsWrap.animate) {
      const h1 = panelsWrap.offsetHeight;
      if (Math.abs(h1 - h0) > 2) {
        panelsWrap.style.overflow = "clip";
        panelsWrap.animate([{ height: h0 + "px" }, { height: h1 + "px" }], { duration: 480, easing: EMPH }).onfinish = () => { panelsWrap.style.overflow = ""; };
      }
    }
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(i));
    t.addEventListener("keydown", e => {
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      select((i + step + tabs.length) % tabs.length, true);
    });
  });
  strip.addEventListener("pointerdown", () => strip.classList.add("pressing"));
  addEventListener("pointerup", () => strip.classList.remove("pressing"));
  addEventListener("resize", () => moveInd(tabs[curTab], true));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveInd(tabs[curTab], true));
  moveInd(tabs[0], true);
  let sx = 0, sy = 0, sw = false;
  panelsWrap.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; sw = !e.target.closest(".trio"); }, { passive: true });
  panelsWrap.addEventListener("touchend", e => {
    if (!sw) return;
    sw = false;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      const next = curTab + (dx < 0 ? 1 : -1);
      if (next >= 0 && next < tabs.length) { select(next); buzzy(8); }
    }
  }, { passive: true });

  const stage = $(".stage");
  if (stage && !calm && matchMedia("(pointer: fine)").matches) {
    let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      stage.style.setProperty("--px", cx.toFixed(4));
      stage.style.setProperty("--py", cy.toFixed(4));
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.0005 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    hero.addEventListener("pointermove", e => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      kick();
    });
    hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; kick(); });
  }

  const morph = (shape, back) => {
    const a = shape.querySelector(back ? ".m-out" : ".m-in");
    if (a && !calm) try { a.beginElement(); } catch (e) {}
  };
  $$(".num").forEach(host => {
    const shape = $(".shape", host);
    if (!shape) return;
    if (!touch) {
      host.addEventListener("pointerenter", () => morph(shape));
      host.addEventListener("pointerleave", () => morph(shape, true));
    } else {
      host.addEventListener("click", () => { morph(shape); setTimeout(() => morph(shape, true), 900); buzzy(6); });
    }
  });

  const countUp = el => {
    const to = Number(el.dataset.count);
    if (calm || !to) return;
    const start = performance.now();
    const dur = 1300;
    const step = now => {
      const t = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(step);
    };
    el.textContent = "0";
    requestAnimationFrame(step);
  };

  const live = $(".live");
  let liveTimer = 0;
  const startLive = () => {
    if (liveWave) liveWave.tween(0.68, 1800);
    if (liveTimer || calm || !live) return;
    const km = $('[data-live="km"]', live);
    const time = $('[data-live="time"]', live);
    let sec = 28 * 60 + 41;
    let dist = 5.24;
    let prog = 0.68;
    liveTimer = setInterval(() => {
      sec += 1;
      dist += 0.0031;
      prog = Math.min(0.98, prog + 0.0025);
      time.textContent = Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
      const next = dist.toFixed(2);
      if (km.textContent !== next) {
        km.textContent = next;
        km.animate([{ transform: "translateY(-6px)", opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: 320, easing: EASE });
      }
      if (liveWave) liveWave.set(prog);
    }, 1000);
  };

  $$(".list-mock li").forEach(li => {
    li.setAttribute("role", "checkbox");
    li.tabIndex = 0;
    const sync = () => li.setAttribute("aria-checked", li.classList.contains("done"));
    const flip = () => { li.classList.toggle("done"); sync(); buzzy(8); };
    li.addEventListener("click", flip);
    li.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } });
    sync();
  });
  $$(".alarm .switch").forEach(sw2 => {
    const flip = () => {
      sw2.classList.toggle("on");
      sw2.setAttribute("aria-checked", sw2.classList.contains("on"));
      buzzy(10);
    };
    sw2.addEventListener("click", flip);
    sw2.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } });
  });
  $$(".days i").forEach(d => d.addEventListener("click", () => { d.classList.toggle("on"); buzzy(6); }));

  const buzzBtn = $("#buzz");
  if (buzzBtn) {
    buzzBtn.addEventListener("click", () => {
      if (navigator.vibrate) navigator.vibrate([12, 60, 12, 60, 30]);
      buzzBtn.animate([{ transform: "translateX(0)" }, { transform: "translateX(-4px) rotate(-2deg)" }, { transform: "translateX(4px) rotate(2deg)" }, { transform: "translateX(-2px)" }, { transform: "translateX(0)" }], { duration: 320, easing: "ease-out" });
      if (!navigator.vibrate) snack(t("Your device doesn't support vibration here"));
    });
  }

  $$("details:not(.langs)").forEach(d => {
    const summary = $("summary", d);
    const body = $("p", d);
    let busy = false;
    summary.addEventListener("click", e => {
      if (calm || !body.animate) return;
      e.preventDefault();
      if (busy) return;
      busy = true;
      if (d.open) {
        const h = body.offsetHeight;
        d.classList.add("closing");
        body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0, paddingBottom: "0px" }], { duration: 300, easing: EASE }).onfinish = () => { d.open = false; d.classList.remove("closing"); busy = false; };
      } else {
        d.open = true;
        const h = body.offsetHeight;
        body.animate([{ height: "0px", opacity: 0, paddingBottom: "0px", transform: "translateY(-6px)" }, { height: h + "px", opacity: 1, transform: "none" }], { duration: 420, easing: EMPH }).onfinish = () => { busy = false; };
      }
    });
  });

  const reel = $(".reel");
  $$(".scroll-btns button").forEach(b => {
    b.addEventListener("click", () => reel.scrollBy({ left: Number(b.dataset.dir) * reel.clientWidth * 0.8, behavior: "smooth" }));
  });

  $$(".trio img, .reel img").forEach(img => {
    if (img.complete && img.naturalWidth) return;
    img.classList.add("ld");
    const done = () => img.classList.remove("ld");
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });

  const carousels = $$(".trio, .acts, .trip, .facts4");
  carousels.forEach(c => {
    const items = [...c.children];
    if (items.length < 2) return;
    const dots = document.createElement("div");
    dots.className = "cdots";
    dots.setAttribute("aria-hidden", "true");
    dots.innerHTML = items.map(() => "<i></i>").join("");
    c.after(dots);
    const marks = [...dots.children];
    let last = -1;
    const update = () => {
      if (c.scrollWidth <= c.clientWidth + 2) return;
      const mid = c.scrollLeft + c.clientWidth / 2;
      let best = 0, bestD = Infinity;
      items.forEach((it, i) => { const d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - mid); if (d < bestD) { bestD = d; best = i; } });
      if (best !== last) { last = best; marks.forEach((m, i) => m.classList.toggle("on", i === best)); }
    };
    c.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    addEventListener("resize", update);
    update();
    marks[0].classList.add("on");
  });

  const box = $("#lightbox");
  const boxImg = $("img", box);
  const boxCap = $(".lb-cap", box);
  let set = [];
  let at = 0;
  const flipFrom = (el, reverse) => {
    if (!el || calm) return null;
    const from = el.getBoundingClientRect();
    if (from.width === 0 || from.bottom < 0 || from.top > innerHeight) return null;
    const to = boxImg.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const s = from.width / to.width;
    const a = `translate(${dx}px,${dy}px) scale(${s})`;
    return boxImg.animate(reverse ? [{ transform: "none" }, { transform: a }] : [{ transform: a }, { transform: "none" }], { duration: reverse ? 340 : 480, easing: reverse ? EASE : EMPH, fill: reverse ? "forwards" : "none" });
  };
  const show = (i, dir) => {
    at = (i + set.length) % set.length;
    const item = set[at];
    boxImg.src = item.thumb;
    boxImg.alt = item.alt;
    boxCap.textContent = `${item.alt} · ${at + 1} / ${set.length}`;
    if (item.full !== item.thumb) {
      const pre = new Image();
      pre.onload = () => { if (set[at] === item) boxImg.src = item.full; };
      pre.src = item.full;
    }
    if (dir && !calm) boxImg.animate([{ transform: `translateX(${dir * 60}px)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 360, easing: EMPH });
  };
  const open = (list, i) => {
    set = list.map(img => ({ thumb: img.currentSrc || img.src, full: img.dataset.full || img.src, alt: img.alt, el: img }));
    show(i);
    box.classList.remove("closing");
    box.showModal();
    requestAnimationFrame(() => flipFrom(set[at].el));
  };
  const close = () => {
    if (!box.open || box.classList.contains("closing")) return;
    box.classList.add("closing");
    const a = flipFrom(set[at] && set[at].el, true);
    const fin = () => { box.close(); box.classList.remove("closing"); boxImg.getAnimations().forEach(x => x.cancel()); boxImg.style.transform = ""; };
    if (a) a.onfinish = fin; else setTimeout(fin, 220);
  };
  $$(".trio").forEach(trio => {
    const imgs = $$("img", trio);
    imgs.forEach((img, i) => img.addEventListener("click", () => open(imgs, i)));
  });
  const reelImgs = $$("img", reel);
  $$("button", reel).forEach((b, i) => b.addEventListener("click", () => open(reelImgs, i)));
  $(".lb-close", box).addEventListener("click", close);
  $(".lb-prev", box).addEventListener("click", () => show(at - 1, -1));
  $(".lb-next", box).addEventListener("click", () => show(at + 1, 1));
  box.addEventListener("cancel", e => { e.preventDefault(); close(); });
  box.addEventListener("click", e => { if (e.target === box) close(); });
  box.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") show(at + 1, 1);
    if (e.key === "ArrowLeft") show(at - 1, -1);
  });
  let drag = null;
  boxImg.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse") return;
    drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, axis: "" };
    boxImg.setPointerCapture(e.pointerId);
    boxImg.getAnimations().forEach(a => a.cancel());
  });
  boxImg.addEventListener("pointermove", e => {
    if (!drag) return;
    drag.dx = e.clientX - drag.x;
    drag.dy = e.clientY - drag.y;
    if (!drag.axis && Math.hypot(drag.dx, drag.dy) > 8) drag.axis = Math.abs(drag.dx) > Math.abs(drag.dy) ? "x" : "y";
    if (drag.axis === "x") boxImg.style.transform = `translateX(${drag.dx}px) rotate(${drag.dx / 60}deg)`;
    if (drag.axis === "y" && drag.dy > 0) {
      const k = Math.min(1, drag.dy / 400);
      boxImg.style.transform = `translateY(${drag.dy}px) scale(${1 - k * 0.25})`;
      box.style.setProperty("--fade", 1 - k);
    }
  });
  const endDrag = () => {
    if (!drag) return;
    const { dx, dy, axis } = drag;
    drag = null;
    const cur = boxImg.style.transform;
    boxImg.style.transform = "";
    box.style.removeProperty("--fade");
    if (axis === "x" && Math.abs(dx) > 70) { show(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); buzzy(6); return; }
    if (axis === "y" && dy > 110) { close(); return; }
    if (cur) boxImg.animate([{ transform: cur }, { transform: "none" }], { duration: 420, easing: SPRING });
  };
  boxImg.addEventListener("pointerup", endDrag);
  boxImg.addEventListener("pointercancel", endDrag);

  const shareBtn = $("#share");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const data = { title: "Leafit", text: t("A calm Android journal for workouts, meals, water and sleep. No account, no ads."), url: location.origin + location.pathname };
      if (navigator.share) {
        try { await navigator.share(data); } catch (e) {}
        return;
      }
      try {
        await navigator.clipboard.writeText(data.url);
        snack(t("Link copied"));
      } catch (e) {
        snack(data.url);
      }
    });
  }

  const ua = navigator.userAgent;
  const ios = !/Android/i.test(ua) && (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1 && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)));
  if (ios) { const n = $(".ios-note"); if (n) n.hidden = false; }

  if (touch) document.querySelectorAll(".blob").forEach(svg => { if (svg.pauseAnimations) svg.pauseAnimations(); });
  if ("IntersectionObserver" in window) {
    const pauser = new IntersectionObserver(entries => {
      entries.forEach(en => {
        en.target.classList.toggle("off", !en.isIntersecting);
        en.target.querySelectorAll("svg").forEach(svg => {
          if (!svg.pauseAnimations || !svg.querySelector("animate")) return;
          if (en.isIntersecting && !(touch && svg.classList.contains("blob"))) svg.unpauseAnimations(); else svg.pauseAnimations();
        });
      });
    }, { rootMargin: "80px 0px" });
    $$("main > section, .marquee, .jar, .foot").forEach(el => pauser.observe(el));
  }

  const targets = $$(".num, .act, .card, .tile, .formula, .private, .design, .live, details:not(.langs), .get, .head, .qr, .calc");
  const onSeen = el => {
    el.classList.add("in");
    if (el.style.transitionDelay) setTimeout(() => { el.style.transitionDelay = ""; }, 1400);
    $$("[data-count]", el).forEach(countUp);
    if (touch && el.classList.contains("num")) {
      const shape = $(".shape", el);
      if (shape) setTimeout(() => { morph(shape); setTimeout(() => morph(shape, true), 1000); }, 500);
    }
    $$(".wv.wave", el).forEach(svg => { const w = headWaves.find(h => h.el === svg); if (w) w.tween(1, 1300); });
    if (el === live) startLive();
  };
  if ("IntersectionObserver" in window && !calm) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { onSeen(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    targets.forEach(el => {
      el.classList.add(el.classList.contains("head") ? "reveal-head" : "reveal");
      const sibs = [...el.parentElement.children].filter(c => c.tagName === el.tagName && c.className.split(" ")[0] === el.className.split(" ")[0]);
      const idx = sibs.indexOf(el);
      if (idx > 0) el.style.transitionDelay = Math.min(idx, 6) * (small() ? 50 : 70) + "ms";
      io.observe(el);
    });
  } else {
    targets.forEach(onSeen);
    headWaves.forEach(w => w.set(1));
    if (liveWave) liveWave.set(0.68);
  }

  const icon = n => `<svg class="ic"><use href="#i-${n}"/></svg>`;
  const pad = n => String(n).padStart(2, "0");
  const clock = m => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  const dur = m => Math.floor(m / 60) + " " + t("h") + (m % 60 ? " " + (m % 60) + " " + t("min") : "");
  const fmtInt = n => Math.round(n).toLocaleString("en-US").replace(/,/g, " ");
  const pageUrl = () => location.origin + location.pathname;
  const typing = el => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  const smooth = () => (calm ? "auto" : "smooth");
  const copyText = async (text, msg) => {
    try { await navigator.clipboard.writeText(text); snack(msg); } catch (e) { snack(text); }
  };
  const tweenNum = (el, to, fmt) => {
    const from = el.dataset.v === undefined ? to : +el.dataset.v;
    el.dataset.v = to;
    cancelAnimationFrame(el._raf);
    if (calm || from === to) { el.textContent = fmt(to); return; }
    const start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / 550);
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) el._raf = requestAnimationFrame(tick);
    };
    el._raf = requestAnimationFrame(tick);
  };
  const pop = el => { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); };

  $$(".step").forEach(st => {
    const out = $("output", st);
    const min = +st.dataset.min, max = +st.dataset.max, inc = +st.dataset.step || 1, loop = st.dataset.wrap === "1";
    const fmt = st.dataset.fmt === "time" ? clock : st.dataset.fmt === "dur" ? dur : String;
    const btns = $$("button", st);
    const set = v => {
      if (loop) v = ((v % (max + inc)) + (max + inc)) % (max + inc);
      else v = Math.max(min, Math.min(max, v));
      const changed = v !== +st.dataset.v;
      st.dataset.v = v;
      out.textContent = fmt(v);
      if (!loop) btns.forEach(b => { b.disabled = (+b.dataset.d < 0 && v <= min) || (+b.dataset.d > 0 && v >= max); });
      st.dispatchEvent(new CustomEvent("stepchange", { bubbles: true }));
      return changed;
    };
    let hold = 0, rep = 0;
    const stop = () => { clearTimeout(hold); clearInterval(rep); };
    btns.forEach(b => {
      const d = +b.dataset.d * inc;
      const bump = () => {
        if (!set(+st.dataset.v + d)) { stop(); return; }
        out.dataset.dir = d > 0 ? "up" : "down";
        pop(out);
        buzzy(4);
      };
      b.addEventListener("pointerdown", e => {
        if (e.button > 0) return;
        b._held = false;
        stop();
        hold = setTimeout(() => { b._held = true; rep = setInterval(bump, 75); }, 420);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach(t => b.addEventListener(t, stop));
      b.addEventListener("click", () => { if (b._held) { b._held = false; return; } bump(); });
    });
    set(+st.dataset.v);
  });

  const kcalBox = $("#calc-kcal");
  if (kcalBox) {
    let sex = "male";
    const val = k => +$(`.step[data-key="${k}"]`, kcalBox).dataset.v;
    const outK = $('[data-out="kcal"]', kcalBox);
    const outB = $('[data-out="bmi"]', kcalBox);
    const cats = [[18.5, "underweight"], [25, "normal"], [30, "overweight"], [Infinity, "obese"]];
    const calc = () => {
      const w = val("weight"), h = val("height"), a = val("age");
      const bmr = 10 * w + 6.25 * h - 5 * a + (sex === "male" ? 5 : sex === "female" ? -161 : -78);
      tweenNum(outK, Math.max(0, Math.round(bmr * 1.2)), fmtInt);
      const bmi = w / Math.pow(h / 100, 2);
      outB.textContent = t("BMI") + " " + bmi.toFixed(1) + ", " + t(cats.find(x => bmi < x[0])[1]) + ".";
    };
    const pick = $$(".pick button", kcalBox);
    pick.forEach(b => b.addEventListener("click", () => {
      sex = b.dataset.g;
      pick.forEach(x => x.setAttribute("aria-pressed", x === b));
      buzzy(6);
      calc();
    }));
    kcalBox.addEventListener("stepchange", calc);
    calc();
  }

  const bedBox = $("#calc-bed");
  if (bedBox) {
    const outT = $('[data-out="bed"]', bedBox);
    const outN = $('[data-out="cycles"]', bedBox);
    const arc = $(".dial-p", bedBox);
    let last = "";
    const calc = () => {
      const alarm = +$('.step[data-key="alarm"]', bedBox).dataset.v;
      const goal = +$('.step[data-key="goal"]', bedBox).dataset.v;
      const bed = (((alarm - goal - 15) % 1440) + 1440) % 1440;
      const txt = clock(bed);
      if (txt !== last) { outT.textContent = txt; if (last) pop(outT); last = txt; }
      const cycles = Math.floor(goal / 90);
      outN.textContent = t("{d} of sleep plus 15 minutes to fall asleep: about {n} cycles of 90 minutes before the alarm.").replace("{d}", dur(goal)).replace("{n}", cycles);
      arc.style.strokeDasharray = (goal + 15) + " 1440";
      arc.style.strokeDashoffset = -bed;
    };
    bedBox.addEventListener("stepchange", calc);
    calc();
  }

  const waterBox = $("#calc-water");
  if (waterBox) {
    const goal = 2000;
    const log = [];
    const jar = $(".jar", waterBox);
    const num = $('[data-out="ml"]', waterBox);
    const left = $('[data-out="left"]', waterBox);
    const undo = $("[data-undo]", waterBox);
    const total = () => log.reduce((a, b) => a + b, 0);
    const render = () => {
      const ml = total();
      jar.style.setProperty("--p", Math.min(1, ml / goal).toFixed(3));
      tweenNum(num, ml, fmtInt);
      left.textContent = ml >= goal ? t("Goal reached") : fmtInt(goal - ml) + " " + t("ml left");
      waterBox.classList.toggle("done", ml >= goal);
      undo.disabled = !log.length;
    };
    $$("[data-ml]", waterBox).forEach(b => b.addEventListener("click", () => {
      const before = total();
      if (before >= 4000) { snack(t("That's plenty of water for one day")); return; }
      log.push(+b.dataset.ml);
      buzzy(8);
      render();
      if (before < goal && total() >= goal) { snack(t("Daily water goal reached")); buzzy([10, 60, 18]); }
    }));
    undo.addEventListener("click", () => { log.pop(); buzzy(6); render(); });
    render();
  }

  const openSheet = d => {
    if (!d || d.open) return;
    $$("dialog.sheet[open]").forEach(o => { if (o !== d) o.close(); });
    d.classList.remove("closing");
    d.showModal();
  };
  const closeSheet = d => {
    if (!d.open || d.classList.contains("closing")) return;
    if (calm) { d.close(); return; }
    d.classList.add("closing");
    setTimeout(() => { d.classList.remove("closing"); d.close(); }, 200);
  };
  $$("dialog.sheet").forEach(d => {
    d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-close]")) closeSheet(d); });
    d.addEventListener("cancel", e => { e.preventDefault(); closeSheet(d); });
    const grab = $(".grab", d);
    const inner = $(".sheet-in", d);
    if (!grab || !inner) return;
    let y0 = null, dy = 0;
    inner.addEventListener("touchstart", e => {
      const body = $(".sheet-body", d);
      if (body && body.contains(e.target) && body.scrollTop > 0) return;
      y0 = e.touches[0].clientY; dy = 0;
    }, { passive: true });
    inner.addEventListener("touchmove", e => {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      inner.style.transform = dy ? `translateY(${dy}px)` : "";
    }, { passive: true });
    inner.addEventListener("touchend", () => {
      if (y0 === null) return;
      y0 = null;
      inner.style.transform = "";
      if (dy > 90) closeSheet(d);
    });
  });

  const esc = t => t.replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const inline = t => esc(t)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  const tags = { important: "Highlights", note: "Also new", caution: "Before you update", warning: "Heads up", tip: "Tip" };
  const md = (text, skip) => {
    let html = "", list = "";
    const close = () => { if (list) { html += "</" + list + ">"; list = ""; } };
    const open = kind => { if (list !== kind) { close(); html += "<" + kind + ">"; list = kind; } };
    text.replace(/\r/g, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/<[^>]+>/g, "").split("\n").forEach(line => {
      const l = line.trim().replace(/^>\s*/, "").trim();
      const alert = l.match(/^\[!(\w+)\]$/);
      if (alert) { close(); const lab = tags[alert[1].toLowerCase()]; if (lab) html += `<p class="md-tag md-${alert[1].toLowerCase()}">${t(lab)}</p>`; return; }
      const li = l.match(/^[-*+]\s+(?:\[[ xX]\]\s+)?(.*)/);
      if (li) { open("ul"); html += "<li>" + inline(li[1]) + "</li>"; return; }
      const ol = l.match(/^\d+[.)]\s+(.*)/);
      if (ol) { open("ol"); html += "<li>" + inline(ol[1]) + "</li>"; return; }
      close();
      if (!l || /^(-{3,}|\*{3,})$/.test(l)) return;
      const h = l.match(/^(#{1,6})\s+(.*)/);
      if (h) {
        if (skip && h[2].trim() === skip) return;
        html += h[2].length > 60 ? "<p class=\"md-lead\">" + inline(h[2]) + "</p>" : "<h4>" + inline(h[2]) + "</h4>";
      } else html += "<p>" + inline(l) + "</p>";
    });
    close();
    return html;
  };
  const news = $("#news");
  const langMenu = $(".langs");
  if (langMenu) document.addEventListener("click", e => { if (langMenu.open && !langMenu.contains(e.target)) langMenu.open = false; });
  const openNews = async () => {
    if (!news) return;
    openSheet(news);
    await releaseReady;
    const body = $('[data-news="body"]', news);
    if (lastRelease && lastRelease.notes) {
      body.innerHTML = md(lastRelease.notes, "Leafit " + lastRelease.version);
      $('[data-news="date"]', news).textContent = t("Released") + " " + lastRelease.date;
    } else {
      body.innerHTML = '<p class="md-wait">' + t("Release notes could not be loaded right now. They are always on GitHub.") + "</p>";
    }
  };
  const chipNew = $(".chip-new");
  if (chipNew && news) chipNew.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    e.preventDefault();
    openNews();
  });

  const fmtAgo = iso => {
    const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) return t("today");
    if (days === 1) return t("yesterday");
    if (days < 30) return t("{n} days ago").replace("{n}", days);
    const m = Math.round(days / 30);
    return m < 12 ? t(m === 1 ? "{n} month ago" : "{n} months ago").replace("{n}", m) : t("{n} y ago").replace("{n}", Math.round(days / 365));
  };
  const statsEl = $(".ghstats");
  const showStats = r => {
    if (!statsEl) return;
    statsEl.hidden = false;
    const put = (k, v) => { const el = $(`[data-stat="${k}"]`, statsEl); if (el) { el.dataset.v = 0; tweenNum(el, v, n => fmtCount(Math.round(n))); } };
    put("stars", r.stars);
    put("forks", r.forks);
    put("issues", r.issues);
    $('[data-stat="pushed"]', statsEl).textContent = fmtAgo(r.pushed);
  };
  const loadStats = async () => {
    const key = "leafit-repo";
    try {
      const c = JSON.parse(sessionStorage.getItem(key) || "null");
      if (c && Date.now() - c.at < 3600000) return c;
    } catch (e) {}
    try {
      const res = await fetch("https://api.github.com/repos/So1uv/Leafit", { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) return null;
      const x = await res.json();
      const r = { at: Date.now(), stars: x.stargazers_count || 0, forks: x.forks_count || 0, issues: x.open_issues_count || 0, pushed: x.pushed_at };
      try { sessionStorage.setItem(key, JSON.stringify(r)); } catch (e) {}
      return r;
    } catch (e) { return null; }
  };
  if (statsEl) {
    const statsP = loadStats();
    const go = () => statsP.then(r => { if (r) showStats(r); });
    if ("IntersectionObserver" in window) {
      const so = new IntersectionObserver(en => { if (en.some(x => x.isIntersecting)) { so.disconnect(); go(); } }, { rootMargin: "0px 0px -10% 0px" });
      so.observe(statsEl.parentElement);
    } else go();
  }

  const totop = $(".totop");
  if (totop) {
    const ring = $(".ring-p", totop);
    let ticking = false;
    const upd = () => {
      ticking = false;
      const p = Math.min(1, scrollY / docMax);
      ring.style.strokeDashoffset = (100 - p * 100).toFixed(2);
      const on = scrollY > 900;
      if (on !== totop.classList.contains("show")) totop.classList.toggle("show", on);
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
    totop.addEventListener("click", () => { scrollTo({ top: 0, behavior: smooth() }); totop.blur(); });
  }

  $$("main section[id]").forEach(sec => {
    const h = $("h2", sec);
    if (!h || sec.id === "get") return;
    const a = document.createElement("a");
    a.className = "anchor";
    a.href = "#" + sec.id;
    a.textContent = "#";
    a.setAttribute("aria-label", t("Copy link to this section"));
    a.addEventListener("click", e => {
      e.preventDefault();
      history.replaceState(null, "", "#" + sec.id);
      copyText(pageUrl() + "#" + sec.id, t("Link to this section copied"));
    });
    h.append(" ", a);
  });

  let installEvt = null;
  addEventListener("beforeinstallprompt", e => { installEvt = e; });
  addEventListener("appinstalled", () => { installEvt = null; snack(t("Leafit site added to your apps")); });
  if ("serviceWorker" in navigator && isSecureContext) {
    addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
  addEventListener("offline", () => snack(t("You're offline. This page keeps working.")));
  addEventListener("online", () => snack(t("Back online")));

  const leafRain = () => {
    if (calm || $(".rain")) return;
    const box = document.createElement("div");
    box.className = "rain";
    box.setAttribute("aria-hidden", "true");
    const tones = ["var(--primary)", "var(--tertiary)", "var(--primary-c)", "var(--secondary)"];
    let html = "";
    for (let i = 0; i < 34; i++) {
      const size = 16 + Math.random() * 22;
      html += `<svg class="ic" style="left:${(Math.random() * 100).toFixed(1)}%;width:${size.toFixed(0)}px;height:${size.toFixed(0)}px;color:${tones[i % 4]};--dx:${(Math.random() * 160 - 80).toFixed(0)}px;--r:${(Math.random() * 720 - 360).toFixed(0)}deg;animation-duration:${(2.8 + Math.random() * 2).toFixed(2)}s;animation-delay:${(Math.random() * 1.4).toFixed(2)}s"><use href="#i-Eco"/></svg>`;
    }
    box.innerHTML = html;
    document.body.append(box);
    buzzy([8, 40, 8, 40, 14]);
    snack(t("Your day, your rhythm"));
    setTimeout(() => box.remove(), 6500);
  };
  let taps = 0, tapTimer = 0;
  $$(".bar .brand").forEach(b => b.addEventListener("click", () => {
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 1600);
    if (taps >= 5) { taps = 0; leafRain(); }
  }));

  const pal = $("#pal");
  const keys = $("#keys");
  if (pal) {
    const input = $("input", pal);
    const list = $(".pal-list", pal);
    const goTo = el => {
      closeSheet(pal);
      setTimeout(() => {
        if (el.id) history.replaceState(null, "", "#" + el.id);
        el.scrollIntoView({ behavior: smooth(), block: "start" });
      }, calm ? 0 : 140);
    };
    const apk = () => ($('[data-gh="apk"]') || {}).href;
    const actions = [
      { icon: () => (isDark() ? "LightMode" : "DarkMode"), title: () => t(isDark() ? "Switch to light theme" : "Switch to dark theme"), kind: "T", words: "theme dark light mode night", run: () => setTheme(isDark() ? "light" : "dark", themeBtn) },
      { icon: () => "FileDownload", title: () => t("Download the latest APK"), kind: "D", words: "download install apk get", run: () => { if (apk()) location.href = apk(); } },
      { icon: () => "AwardStar", title: () => t("What's new in this release"), kind: "N", words: "changelog release notes update version new", run: () => openNews() },
      { icon: () => "ContentCopy", title: () => t("Copy link to this page"), kind: "Action", words: "copy link url", run: () => copyText(pageUrl(), t("Link copied")) },
      { icon: () => "Share", title: () => t("Share Leafit"), kind: "Action", words: "share send", run: () => { const sb = $("#share"); if (sb) sb.click(); } },
      { icon: () => "KeyboardArrowUp", title: () => t("Back to top"), kind: "U", words: "top start up", run: () => scrollTo({ top: 0, behavior: smooth() }) },
      { icon: () => "Keyboard", title: () => t("Keyboard shortcuts"), kind: "?", words: "keys keyboard help shortcuts", run: () => openSheet(keys) },
      { icon: () => "Restore", title: () => t("Changelog: every release"), kind: "Link", words: "changelog history releases versions timeline", run: () => { location.href = "changelog/"; } },
      { icon: () => "Database", title: () => t("Source code on GitHub"), kind: "Link", words: "github code repo source open", run: () => { location.href = "https://github.com/So1uv/Leafit"; } },
      { icon: () => "PhoneAndroid", title: () => t("Add this site to your apps"), kind: "Action", words: "install pwa app offline", when: () => !!installEvt, run: () => { if (installEvt) installEvt.prompt(); } },
      { icon: () => "Eco", title: () => t("Let it rain leaves"), kind: "Fun", words: "leaf leaves rain fun", secret: true, run: () => leafRain() }
    ];
    const sections = $$("main section[id]").map(sec => {
      const h = $("h2", sec);
      if (!h) return null;
      const k = $(".kicker", sec);
      const title = h.textContent.replace(/\s*#\s*$/, "").trim();
      return { icon: () => "ChevronRight", title: () => title, sub: k ? k.textContent.trim() : "", kind: "Section", words: sec.id, run: () => goTo(sec) };
    }).filter(Boolean);
    const faqs = $$("#faq details").map(d => {
      const q = $("summary", d).textContent.trim();
      const a = $("p", d);
      return { icon: () => "Info", title: () => q, sub: t("Questions"), kind: "FAQ", words: a ? a.textContent : "", run: () => { d.open = true; goTo(d); } };
    });
    const all = [...actions, ...sections, ...faqs];
    let shown = [], active = 0;
    const score = (it, q) => {
      const t = it.title().toLowerCase();
      const hay = (t + " " + (it.sub || "") + " " + (it.words || "")).toLowerCase();
      const terms = q.split(/\s+/).filter(Boolean);
      if (!terms.every(w => hay.includes(w))) return 0;
      let sc = 1;
      if (t.startsWith(q)) sc += 6;
      terms.forEach(w => { if (t.includes(w)) sc += 2; if (new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(t)) sc += 2; });
      return sc;
    };
    const mark = (text, q) => {
      const safe = esc(text);
      const terms = q.split(/\s+/).filter(w => w.length > 1).map(w => esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      return terms.length ? safe.replace(new RegExp("(" + terms.join("|") + ")", "gi"), "<mark>$1</mark>") : safe;
    };
    const setActive = i => {
      if (!shown.length) return;
      active = (i + shown.length) % shown.length;
      $$("li", list).forEach((li, n) => li.setAttribute("aria-selected", n === active));
      const cur = list.children[active];
      if (cur) { input.setAttribute("aria-activedescendant", cur.id); cur.scrollIntoView({ block: "nearest" }); }
    };
    const render = () => {
      const q = input.value.trim().toLowerCase();
      const pool = all.filter(it => (!it.when || it.when()) && (!it.secret || q.length >= 3));
      shown = q ? pool.map(it => [it, score(it, q)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 12) : pool.filter(it => !it.secret).slice(0, 30);
      list.innerHTML = shown.length ? shown.map((it, i) => {
        const k = it.kind.length === 1 ? `<kbd>${esc(it.kind)}</kbd>` : `<span class="pal-k">${esc(t(it.kind))}</span>`;
        return `<li role="option" id="pal-o${i}" aria-selected="false"><span class="pal-ic">${icon(it.icon())}</span><span class="pal-t"><b>${mark(it.title(), q)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span>${k}</li>`;
      }).join("") : '<li class="pal-none" aria-disabled="true">' + esc(t("Nothing here. Try “sleep”, “GPS” or “dark”.")) + "</li>";
      setActive(0);
    };
    const run = i => {
      const it = shown[i];
      if (!it) return;
      if (it.kind === "Section" || it.kind === "FAQ") { it.run(); return; }
      closeSheet(pal);
      setTimeout(() => it.run(), calm ? 0 : 160);
    };
    input.addEventListener("input", render);
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") { e.preventDefault(); run(active); }
    });
    list.addEventListener("pointermove", e => { const li = e.target.closest("li[role=option]"); if (li) { const i = [...list.children].indexOf(li); if (i !== active) setActive(i); } });
    list.addEventListener("click", e => { const li = e.target.closest("li[role=option]"); if (li) run([...list.children].indexOf(li)); });
    const openPal = () => {
      input.value = "";
      render();
      openSheet(pal);
      setTimeout(() => input.focus(), 30);
    };
    const findBtn = $("#find");
    if (findBtn) findBtn.addEventListener("click", openPal);

    addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (pal.open) closeSheet(pal); else openPal();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || typing(document.activeElement)) return;
      if ($("dialog[open]")) return;
      const k = e.key;
      const jump = id => { const el = $(id); if (el) el.scrollIntoView({ behavior: smooth(), block: "start" }); };
      if (k === "/") { e.preventDefault(); openPal(); }
      else if (k === "?") { e.preventDefault(); openSheet(keys); }
      else if (k === "t" || k === "T") setTheme(isDark() ? "light" : "dark", themeBtn);
      else if (k === "d" || k === "D") { if (apk()) location.href = apk(); }
      else if (k === "n" || k === "N") openNews();
      else if (k === "s" || k === "S") jump("#gallery");
      else if (k === "q" || k === "Q") jump("#faq");
      else if (k === "u" || k === "U") scrollTo({ top: 0, behavior: smooth() });
    });
  }

  const scrolly = $(".scrolly");
  if (scrolly) {
    const steps = $$(".sc-step", scrolly);
    const shots = $$(".sc-phone img", scrolly);
    const marks = $$(".sc-dots i", scrolly);
    let on = 0;
    const pick = i => {
      if (i === on) return;
      on = i;
      steps.forEach((x, n) => x.classList.toggle("on", n === i));
      shots.forEach((x, n) => x.classList.toggle("on", n === i));
      marks.forEach((x, n) => x.classList.toggle("on", n === i));
    };
    if ("IntersectionObserver" in window) {
      const so = new IntersectionObserver(en => en.forEach(x => { if (x.isIntersecting) pick(+x.target.dataset.i); }), { rootMargin: "-45% 0px -45% 0px" });
      steps.forEach(x => so.observe(x));
    }
  }
})();
