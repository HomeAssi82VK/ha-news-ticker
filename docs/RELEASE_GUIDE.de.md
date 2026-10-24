# Repository- und HACS-Veröffentlichung

**Geplanter Repo-Name:** `ha-news-ticker` · **GitHub:** `HomeAssi82VK`

## Repository erstellen

1. Auf GitHub neues **öffentliches** Repository `ha-news-ticker` erstellen. **Issues** aktiv lassen. Beschreibung: `Customizable RSS/Atom news ticker for Home Assistant with a visual card editor.`
2. Topics eintragen: `home-assistant`, `hacs`, `rss`, `atom`, `lovelace`, `news-ticker`.
3. Dateien aus der **Wurzel** dieses ZIPs ins Repository legen; nicht das ZIP selbst als Datei hochladen.
4. `.github/FUNDING.yml` ist bereits auf `https://buymeacoffee.com/homeassi82vk` eingestellt; GitHub zeigt darüber den Sponsor-Button.
5. Unter **Actions** die Jobs `python-and-javascript`, `validate-hacs` und `validate-hassfest` prüfen.
6. Nach erfolgreichen Tests eine **GitHub Release** (nicht nur Tag) `v1.0.6-beta.7` erstellen; `CHANGELOG.md` als Release-Notizen verwenden. **Kein separates ZIP-Release-Asset nötig**, weil HACS den Repository-Inhalt aus `custom_components/news_ticker` übernimmt.
7. Tester können `https://github.com/HomeAssi82VK/ha-news-ticker` unter HACS → Benutzerdefinierte Repositories mit Kategorie **Integration** hinzufügen. Danach Core neu starten und Ressource eintragen.

## Vor offizieller HACS-Katalog-Aufnahme

- **Offiziellen HACS- und Hassfest-Workflow erfolgreich bestehen** lassen. Das wurde hier noch nicht auf GitHub ausgeführt.
- Die derzeitige HACS-Integrationsdokumentation verlangt eine passende **Home Assistant Brands**-Einbindung bzw. ein akzeptiertes Branding. Dafür Branding gemäß den aktuell gültigen HA-Brands-Richtlinien ergänzen; noch nicht erledigt.
- `manifest.json`-Metadaten und Repository-Adresse kontrollieren; sie sind auf `HomeAssi82VK/ha-news-ticker` vorbereitet.
- Mehrere unabhängige Installationen testen und ggf. Probleme beheben.
- Erst danach PR an `hacs/default` nach den aktuellen offiziellen HACS-Regeln erstellen.

## Updates

Eine neue veröffentlichte Version braucht synchronisierte Versionen im `manifest.json` und der JavaScript-Datei sowie einen neuen GitHub-Release-Tag. HACS bietet diesen als Update an; die installierenden Personen müssen Core neu starten, wenn Python-Code geändert wurde. Bei JavaScript-Änderungen die URL `?v=...` nachziehen und Browser neu laden.

## GitHub Desktop (einfachste Variante)

ZIP in einen lokalen Ordner entpacken → GitHub Desktop → `File > Add local repository` (bei nicht vorhandenem `.git`: `Create a Repository here`) → `Publish repository` → Öffentlichkeit prüfen. Als Repo-Name `ha-news-ticker` verwenden. Nicht aus Versehen den umschließenden temporären Downloadordner als zusätzlichen Pfad mit hochladen.
