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

## Installation with HACS (custom repository)

1. In HACS, open **Custom repositories** and add your public GitHub URL as category **Integration**.
2. Install **News Ticker**, then **restart Home Assistant Core**.
3. In **Settings → Devices & services → Add integration**, add **News Ticker**.
4. In **Settings → Dashboards → Resources**, add the following as **JavaScript module**:

   ```text
   /news_ticker/news-ticker-card.js?v=1.0.6-beta.7
   ```

5. Reload the dashboard (hard refresh). In the card picker, choose **By card → Community cards → News Ticker Card**.
6. Add RSS sources in the visual editor. You can also use [the YAML example](examples/card.yaml).

**Note:** HACS installs the integration files, **not the Lovelace resource registration**. If you upgrade this beta and your browser still displays old JavaScript, update the URL query to the new release version and refresh. Python backend upgrades need a Core restart.

### Manual install

Copy `custom_components/news_ticker` to `/config/custom_components/news_ticker` and follow steps 2–6 above. Avoid mixing a manual folder with a HACS-managed installation of the same integration.

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
