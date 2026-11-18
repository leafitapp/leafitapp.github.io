# Leafit website

Source of https://leafitapp.github.io, the site for the Leafit Android app.

App and source code: https://github.com/So1uv/Leafit

## Translations

The English pages (`index.html`, `changelog/index.html`) are the source. The Ukrainian and Russian pages in `uk/` and `ru/` are generated from them:

```
python3 tools/build_i18n.py --report
```

Strings live in `tools/i18n/uk.json` and `tools/i18n/ru.json`. After changing English text, run the command above; it lists every string that still needs a translation.
