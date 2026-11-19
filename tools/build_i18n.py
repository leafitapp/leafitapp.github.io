import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ["index.html", "changelog/index.html"]
LANGS = {"uk": "uk_UA", "ru": "ru_RU"}
SITE = "https://leafitapp.github.io/"
ATTRS = ("alt", "aria-label", "placeholder", "title")
META = {"description", "og:title", "og:description", "og:image:alt", "twitter:title", "twitter:description"}
LETTER = re.compile(r"[A-Za-z]")
SKIP = {"Leafit", "Leafit 2.5.0", "GitHub", "Ko-fi", "APK", "GPS", "Esc", "Enter", "Ctrl", "Soluv", "Google Fit", "Samsung Health", "Sleep as Android", "PB", "English", "Українська", "Русский", "OpenStreetMap", "Obtainium", "BMI", "Wrapped", "Leafit Wrapped", "Leafit Relay", "Ctrl K"}


def load(lang):
    path = os.path.join(ROOT, "tools", "i18n", lang + ".json")
    if not os.path.exists(path):
        return {"html": {}, "js": {}}
    return json.load(open(path, encoding="utf-8"))


def need(text):
    core = text.strip()
    return bool(core) and bool(LETTER.search(core)) and core not in SKIP and len(core) > 1 and core not in ("en", "uk", "ru")


def tr_text(text, d, missing):
    core = text.strip()
    if not need(core):
        return text
    if core in d:
        lead = text[:len(text) - len(text.lstrip())]
        tail = text[len(text.rstrip()):]
        return lead + d[core] + tail
    missing.add(core)
    return text


def tr_json(v, d, missing):
    if isinstance(v, dict):
        return {k: (tr_json(x, d, missing) if k in ("name", "description", "text", "alternateName", "headline") or isinstance(x, (dict, list)) else x) for k, x in v.items()}
    if isinstance(v, list):
        return [tr_json(x, d, missing) for x in v]
    if isinstance(v, str) and need(v) and not v.startswith("http"):
        if v in d:
            return d[v]
        missing.add(v)
    return v


TOKEN = re.compile(r"(<!--.*?-->|<script\b.*?</script>|<style\b.*?</style>|<svg\b.*?</svg>|<[^>]+>)", re.S)


def tr_tag(tag, d, missing):
    if tag.startswith("<meta"):
        m = re.search(r'(?:name|property)="([^"]+)"', tag)
        if m and m.group(1) in META:
            return re.sub(r'content="([^"]*)"', lambda x: 'content="' + tr_text(x.group(1), d, missing).replace('"', "&quot;") + '"', tag)
        return tag
    for a in ATTRS:
        tag = re.sub(r'(\s' + a + r')="([^"]*)"', lambda x: x.group(1) + '="' + tr_text(x.group(2), d, missing).replace('"', "&quot;") + '"', tag)
    return tag


def translate(html, d, missing):
    out = []
    for part in TOKEN.split(html):
        if not part:
            continue
        if part.startswith("<script") and 'type="application/ld+json"' in part:
            body = re.search(r">(.*)</script>", part, re.S).group(1)
            data = tr_json(json.loads(body), d, missing)
            out.append(part[:part.index(">") + 1] + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "</script>")
        elif part.startswith("<svg"):
            out.append(re.sub(r'<svg\b[^>]*>', lambda x: tr_tag(x.group(0), d, missing), part, count=1))
        elif part.startswith("<!--") or part.startswith("<script") or part.startswith("<style"):
            out.append(part)
        elif part.startswith("<"):
            out.append(tr_tag(part, d, missing))
        else:
            out.append(tr_text(part, d, missing))
    return "".join(out)


def relink(html):
    def fix(m):
        attr, val = m.group(1), m.group(2)
        if re.match(r"^(/|#|https?:|mailto:|data:)", val):
            return m.group(0)
        if "assets/" in val or "manifest.webmanifest" in val or "sitemap.xml" in val:
            return f'{attr}="../{val}"'
        return m.group(0)
    return re.sub(r'\b(href|src)="([^"]*)"', fix, html)


def localize(html, page, lang):
    path = page.replace("index.html", "")
    html = html.replace('<html lang="en">', f'<html lang="{lang}">', 1)
    html = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{SITE}{lang}/{path}">', html, count=1)
    html = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{SITE}{lang}/{path}">', html, count=1)
    html = html.replace('<meta property="og:locale" content="en_US">', f'<meta property="og:locale" content="{LANGS[lang]}">', 1)
    html = re.sub(r'(<a href="[^"]*" hreflang="\w+" lang="\w+") aria-current="true">', r"\1>", html)
    html = re.sub(r'(<a href="[^"]*" hreflang="' + lang + r'" lang="' + lang + r'")>', r'\1 aria-current="true">', html)
    ver = re.search(r"\?v=(\d+)", html)
    v = ver.group(1) if ver else "1"
    html = re.sub(r'(<script src="[^"]*(?:app|changelog)\.js\?v=\d+" defer></script>)', lambda m: f'<script src="{"../" if page != "index.html" else ""}assets/i18n/{lang}.js?v={v}" defer></script>\n' + m.group(1), html, count=1)
    return relink(html)


def main():
    report = "--report" in sys.argv
    for lang in LANGS:
        data = load(lang)
        missing = set()
        for page in PAGES:
            src = open(os.path.join(ROOT, page), encoding="utf-8").read()
            out = localize(translate(src, data["html"], missing), page, lang)
            dest = os.path.join(ROOT, lang, page)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            open(dest, "w", encoding="utf-8").write(out)
        os.makedirs(os.path.join(ROOT, "assets", "i18n"), exist_ok=True)
        js = "window.LEAFIT_I18N=" + json.dumps(data["js"], ensure_ascii=False, separators=(",", ":")) + ";\n"
        open(os.path.join(ROOT, "assets", "i18n", lang + ".js"), "w", encoding="utf-8").write(js)
        if missing:
            print(f"{lang}: {len(missing)} strings without translation")
            if report:
                for m in sorted(missing):
                    print("  " + json.dumps(m, ensure_ascii=False))
        else:
            print(f"{lang}: complete")


if __name__ == "__main__":
    main()
