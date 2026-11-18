(() => {
  const root = document.documentElement;
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
  const applyRelease = r => {
    const set = (key, fn) => $$(`[data-gh="${key}"]`).forEach(fn);
    set("short", el => { el.textContent = r.short; });
    set("name", el => { el.textContent = "Leafit " + r.version; });
    set("date", el => { el.textContent = "Released " + r.date; });
    if (r.size) set("size", el => { el.textContent = " · " + fmtSize(r.size); });
    if (r.apk) set("apk", el => { el.href = r.apk; });
    if (r.downloads > 0) set("downloads", el => { el.textContent = fmtCount(r.downloads) + " downloads"; el.hidden = false; });
  };
  const loadRelease = async () => {
    const key = "leafit-release";
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
        date: new Date(latest.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        size: apk ? apk.size : 0,
        apk: apk ? apk.browser_download_url : "",
        downloads
      };
      try { sessionStorage.setItem(key, JSON.stringify(r)); } catch (e) {}
      applyRelease(r);
    } catch (e) {}
  };
  loadRelease();

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
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      const dy = y - lastY;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = Math.min(1, y / Math.max(1, max));
      bar.classList.toggle("scrolled", y > 8);
      progressWave.set(p);
      progressWave.setAmp(p > 0.995 ? 0 : 1);
      clearTimeout(idleT);
      idleT = setTimeout(() => progressWave.setAmp(p > 0.995 ? 0 : 0.35), 650);
      const heroEnd = hero.offsetTop + hero.offsetHeight - 120;
      if (y < heroEnd || p > 0.985) {
        clearTimeout(dockT);
        dock.classList.toggle("show", y >= heroEnd);
      } else if (dy > 6) {
        clearTimeout(dockT);
        dock.classList.remove("show");
        dockT = setTimeout(() => { if (scrollY >= hero.offsetTop + hero.offsetHeight - 120) dock.classList.add("show"); }, 900);
      } else if (dy < -6) {
        clearTimeout(dockT);
        dock.classList.add("show");
      }
      let active = "";
      for (const s of spyTargets) if (s.getBoundingClientRect().top <= innerHeight * 0.38) active = s.id;
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
  if (!calm) $$(".btn, .icon-btn, .seg button, .tabs button, .chip-new, summary, .nav a, .list-mock li").forEach(el => el.addEventListener("pointerdown", ripple));

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
      if (!navigator.vibrate) snack("Your device doesn't support vibration here");
    });
  }

  $$("details").forEach(d => {
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
      const data = { title: "Leafit", text: "A calm Android journal for workouts, meals, water and sleep. No account, no ads.", url: location.origin + "/" };
      if (navigator.share) {
        try { await navigator.share(data); } catch (e) {}
        return;
      }
      try {
        await navigator.clipboard.writeText(data.url);
        snack("Link copied");
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
    $$(".hero, .get, .live, #spaces, .numbers, .marquee, .glass").forEach(el => pauser.observe(el));
  }

  const targets = $$(".num, .act, .card, .tile, .formula, .private, .design, .live, details, .get, .head, .qr");
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
})();
