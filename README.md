# News Ticker for Home Assistant

A customizable RSS/Atom news ticker for Home Assistant dashboards, combining a backend feed fetcher with a Lovelace card and a **visual configuration editor**.

**Current release:** `v1.0.6-beta.7` · Community beta, tested on Home Assistant 2026 in one installation. Wider compatibility is being evaluated.

**Deutsch:** [Deutsche Anleitung](docs/README.de.md) · [Changelog](CHANGELOG.md) · [Report a bug](https://github.com/HomeAssi82VK/ha-news-ticker/issues) · [Support the project](#support)

## Features

- Up to **8 RSS/Atom sources per card**, manageable directly in the visual editor
- **3 animation styles:** continuous ticker, slide, fade
- **5 theme choices:** Cinematic Nightglow, TV News Classic, Minimal Dark, Transparent, Custom
- Headline click-through, source labels, configurable clock, speed, fonts, filtering and intervals
- Python backend fetches and caches feeds; broken feed XML may be partially recovered
- Public HTTP(S) URLs only; built-in blocking of local/private RSS destinations
- Compatible with Grid and Sections views in the environment tested

## Beta installation (not yet in the official HACS catalog)

**News Ticker is not yet listed in the official HACS catalog.** During beta testing, you can install it through HACS as a **custom repository**. This also enables future updates through HACS once GitHub releases are available.

1. Open **HACS → ⋮ → Custom repositories**.
2. Enter the **News Ticker repository URL**, not your personal GitHub profile URL:

   ```text
   https://github.com/HomeAssi82VK/ha-news-ticker
   ```

3. Select category **Integration** and add the repository.
4. Find **News Ticker** in HACS and install it, then **restart Home Assistant Core**.
5. Go to **Settings → Devices & services → Add integration → News Ticker**.
6. Under **Settings → Dashboards → Resources**, add this URL as a **JavaScript module**:

   ```text
   /news_ticker/news-ticker-card.js?v=1.0.6-beta.7
   ```

7. Hard-refresh your browser. Edit your dashboard → **Add card → By card → Community cards → News Ticker Card**. Enter your RSS URLs in the visual editor.

**Why two steps inside Home Assistant?** The integration retrieves and caches feeds; the dashboard resource loads the visual card. The resource registration is currently a separate step.

### Manual installation (without HACS)

1. Download the repository source ZIP from GitHub and extract it.
2. Copy the entire `custom_components/news_ticker` folder into `/config/custom_components/news_ticker` on your Home Assistant installation.
3. **Restart Home Assistant Core**.
4. Go to **Settings → Devices & services → Add integration → News Ticker**.
5. Add `/news_ticker/news-ticker-card.js?v=1.0.6-beta.7` as a **JavaScript module** in **Settings → Dashboards → Resources**.
6. Hard-refresh the browser, then add **News Ticker Card** from **By card → Community cards** and configure your RSS URLs.

Do not mix a HACS-managed installation and a manually maintained copy of the same integration. After a JavaScript update, change the `?v=` query to match the installed release and refresh; Python updates normally require a Core restart.

## Example feeds

| Source | URL |
|---|---|
| Tagesschau Saarland | `https://www.tagesschau.de/inland/regional/saarland/index~rss2.xml` |
| heise (Atom) | `https://www.heise.de/newsticker/heise-atom.xml` |
| Radio SALÜ traffic | `http://www.salue.de/stausblitzer/staus.xml` |

Feeds are operated by third parties; availability and content are beyond this project's control.

## What the two components do

**Integration: News Ticker** fetches, validates and caches online feeds. **Dashboard card: News Ticker Card** displays the headlines and provides the visual editor. This is one HACS **Integration** repository, not two separate HACS packages.

## Compatibility and known limitations

- Currently a beta. Not yet accepted into the official HACS default catalog.
- The Home Assistant dashboard card picker can be affected by other third-party cards that reassign `window.customCards`; this release uses the standard registration without patching Home Assistant internals.
- RSS feeds with malformed XML may yield only recoverable entries or no headlines.
- Feeds hosted on private IP addresses/LANs and nonstandard ports are intentionally blocked.
- No guarantee of universal compatibility; feedback via Issues is welcome.

## Updates and releases

HACS can offer new GitHub releases from this repository. Releases should use tags like `v1.0.6-beta.7` and keep `custom_components/news_ticker/manifest.json` and the frontend `VERSION` consistent. See [release checklist](docs/RELEASE_GUIDE.de.md).

## Support

If you find News Ticker useful, you can [buy me a coffee](https://buymeacoffee.com/homeassi82vk) ☕. Support is optional; the integration is free to use. GitHub also displays a Sponsor button configured in `.github/FUNDING.yml`.

## License

[MIT](LICENSE) · Independent community project, not affiliated with Home Assistant or feed publishers.
