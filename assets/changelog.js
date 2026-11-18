(() => {
  const root = document.documentElement;
  const DICT = window.LEAFIT_I18N || {};
  const t = str => DICT[str] || str;
  const lang = (root.lang || "en").slice(0, 2);
  const locale = lang === "uk" ? "uk-UA" : lang === "ru" ? "ru-RU" : "en-GB";
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : dark.matches;
  const themeBtn = $("#theme");
  const paint = () => $$('meta[name="theme-color"]').forEach(m => { m.content = isDark() ? "#111412" : "#F5FBF6"; });
  const apply = mode => {
    root.dataset.theme = mode;
    try { localStorage.setItem("leafit-theme", mode); } catch (e) {}
    paint();
  };
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const mode = isDark() ? "light" : "dark";
    if (calm || !document.startViewTransition) return apply(mode);
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add("vt");
    const tr = document.startViewTransition(() => apply(mode));
    tr.ready.then(() => root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] }, { duration: 650, easing: "cubic-bezier(.05,.7,.1,1)", pseudoElement: "::view-transition-new(root)" }));
    tr.finished.finally(() => root.classList.remove("vt"));
  });
  dark.addEventListener("change", paint);
  paint();

  const langs = $(".langs");
  if (langs) document.addEventListener("click", e => { if (langs.open && !langs.contains(e.target)) langs.open = false; });

  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const inline = s => esc(s)
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
      if (alert) { close(); const k = alert[1].toLowerCase(); if (tags[k]) html += `<p class="md-tag md-${k}">${t(tags[k])}</p>`; return; }
      const li = l.match(/^[-*+]\s+(?:\[[ xX]\]\s+)?(.*)/);
      if (li) { open("ul"); html += "<li>" + inline(li[1]) + "</li>"; return; }
      const ol = l.match(/^\d+[.)]\s+(.*)/);
      if (ol) { open("ol"); html += "<li>" + inline(ol[1]) + "</li>"; return; }
      close();
      if (!l || /^(-{3,}|\*{3,})$/.test(l)) return;
      const h = l.match(/^(#{1,6})\s+(.*)/);
      if (h) {
        if (skip && skip.includes(h[2].trim())) return;
        html += h[2].length > 60 ? '<p class="md-lead">' + inline(h[2]) + "</p>" : "<h4>" + inline(h[2]) + "</h4>";
      } else html += "<p>" + inline(l) + "</p>";
    });
    close();
    return html;
  };

  const fmtSize = b => Math.round(b / 1e6) + " MB";
  const fmtInt = n => Math.round(n).toLocaleString("en-US").replace(/,/g, " ");
  const list = $('[data-cl="list"]');
  const stats = $('[data-cl="stats"]');

  const render = rels => {
    const total = rels.reduce((s, r) => s + (r.assets || []).reduce((a, x) => a + (x.download_count || 0), 0), 0);
    stats.textContent = t(rels.length === 1 ? "{n} release" : "{n} releases").replace("{n}", rels.length) + " · " + t("{n} downloads in total").replace("{n}", fmtInt(total));
    stats.hidden = false;
    list.innerHTML = rels.map((r, i) => {
      const version = (r.tag_name || "").replace(/^[^0-9]*/, "") || r.tag_name;
      const name = r.name || "Leafit " + version;
      const date = new Date(r.published_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
      const apk = (r.assets || []).find(a => /\.apk$/i.test(a.name));
      const dl = (r.assets || []).reduce((a, x) => a + (x.download_count || 0), 0);
      const body = md(r.body || "", [name, "Leafit " + version]) || `<p>${t("No notes for this release.")}</p>`;
      const long = (r.body || "").length > 900;
      return `<li class="tl-i${i === 0 ? " latest" : ""}" id="v${esc(version)}">
        <span class="tl-dot" aria-hidden="true"></span>
        <article class="tl-card">
          <header class="tl-h">
            <span class="tl-v">${esc(version.replace(/\.0$/, ""))}</span>
            <div class="tl-t"><h2>${esc(name)}</h2><time datetime="${esc(r.published_at)}">${esc(date)}</time></div>
            ${i === 0 ? `<span class="tl-tag">${t("Latest")}</span>` : r.prerelease ? `<span class="tl-tag pre">${t("Pre-release")}</span>` : ""}
          </header>
          <div class="md tl-body${long ? " clip" : ""}">${body}</div>
          ${long ? `<button class="btn btn-tonal btn-sm tl-more" type="button" aria-expanded="false"><svg class="ic"><use href="#i-ExpandMore"/></svg><span>${t("Show everything")}</span></button>` : ""}
          <footer class="tl-f">
            ${apk ? `<a class="btn btn-filled btn-sm" href="${esc(apk.browser_download_url)}"><svg class="ic"><use href="#i-FileDownload"/></svg>APK · ${fmtSize(apk.size)}</a>` : ""}
            <a class="btn btn-tonal btn-sm" href="${esc(r.html_url)}">GitHub</a>
            ${dl ? `<span class="tl-dl">${t("{n} downloads").replace("{n}", fmtInt(dl))}</span>` : ""}
          </footer>
        </article>
      </li>`;
    }).join("");
    $$(".tl-more", list).forEach(b => b.addEventListener("click", () => {
      const body = b.previousElementSibling;
      const openNow = body.classList.toggle("clip") === false;
      b.setAttribute("aria-expanded", openNow);
      $("span", b).textContent = t(openNow ? "Show less" : "Show everything");
      if (!openNow) b.closest(".tl-card").scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    }));
    const items = $$(".tl-i", list);
    if ("IntersectionObserver" in window && !calm) {
      const io = new IntersectionObserver(en => en.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -8% 0px" });
      items.forEach(x => { x.classList.add("reveal"); io.observe(x); });
    }
    if (location.hash) { const target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView(); }
  };

  const fail = () => {
    list.innerHTML = `<li class="tl-wait">${t("Releases could not be loaded right now.")} <a href="https://github.com/So1uv/Leafit/releases">${t("Open them on GitHub")}</a></li>`;
  };

  const load = async () => {
    const key = "leafit-releases-all";
    try {
      const c = JSON.parse(sessionStorage.getItem(key) || "null");
      if (c && Date.now() - c.at < 3600000) return render(c.list);
    } catch (e) {}
    try {
      const res = await fetch("https://api.github.com/repos/So1uv/Leafit/releases?per_page=100", { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) return fail();
      const rels = (await res.json()).filter(r => !r.draft);
      if (!rels.length) return fail();
      const slim = rels.map(r => ({ tag_name: r.tag_name, name: r.name, body: r.body, published_at: r.published_at, html_url: r.html_url, prerelease: r.prerelease, assets: (r.assets || []).map(a => ({ name: a.name, size: a.size, download_count: a.download_count, browser_download_url: a.browser_download_url })) }));
      try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), list: slim })); } catch (e) {}
      render(slim);
    } catch (e) { fail(); }
  };
  load();

  if ("serviceWorker" in navigator && isSecureContext) addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
})();
