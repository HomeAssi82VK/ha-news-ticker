# Release-Checkliste – News Ticker v1.1.2

1. Das vollständige Repository auf `main` hochladen bzw. die geänderten Dateien im bestehenden Repository ersetzen. Kein neues Repository anlegen.
2. Vor dem Release die Versionsnummern im Manifest, im Frontend, in der README und in der deutschen Anleitung kontrollieren.
3. Unter GitHub Actions die HACS-, Hassfest- und Python/JavaScript-Prüfungen abwarten.
4. Nach erfolgreichen Prüfungen das stabile Release `v1.1.2` vom aktuellen `main`-Commit veröffentlichen. Kein Pre-release.
5. Über HACS installieren bzw. aktualisieren; Home Assistant Core neu starten und die Dashboard-Ressource `/news_ticker/news-ticker-card.js?v=1.1.2` kontrollieren.

Der HACS-Aufnahme-Pull-Request #12602 ist bereits zusammengeführt. Für reguläre Updates ist kein neuer HACS-PR nötig.
