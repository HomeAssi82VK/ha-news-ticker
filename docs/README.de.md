# News Ticker – deutsche Anleitung

**News Ticker v1.0.6 Beta 7** kombiniert eine Home-Assistant-Integration zum RSS-Abruf und eine Dashboard-Karte mit grafischem Editor. Die im Alltag funktionierende Version nutzt **keinen internen Home-Assistant-Katalog-Patch**.

## Funktionen

- Bis zu acht RSS-/Atom-Feeds pro Karte (aktivieren, prüfen, sortieren, entfernen)
- Laufmodi: Endloslauf, Ein-/Ausfahren und Überblenden
- Themes: Nightglow, TV News, Minimal Dark, Transparent und eigene Farben
- Schriftgröße, Geschwindigkeit, Uhr, Quellenanzeige, Filter und Aktualisierungsintervall
- Schlagzeilen öffnen die verlinkten Artikel
- Serverbasierter RSS-Abruf mit Cache und Fehlerdiagnose
- Fortlaufender Ticker auch bei nur einer Schlagzeile

## Installation über HACS

1. **GitHub-Repository öffentlich veröffentlichen.** In HACS unter **Benutzerdefinierte Repositories** `https://github.com/HomeAssi82VK/ha-news-ticker` als **Integration** hinzufügen. Der Link funktioniert erst, wenn das Repository existiert.
2. **News Ticker** über HACS installieren.
3. **Home Assistant Core neu starten** (nicht das ganze Betriebssystem).
4. **Einstellungen → Geräte & Dienste → Integration hinzufügen → News Ticker** aktivieren.
5. **Einstellungen → Dashboards → Ressourcen**: folgende URL mit dem Typ **JavaScript-Modul** hinzufügen:

   ```text
   /news_ticker/news-ticker-card.js?v=1.0.6-beta.7
   ```

6. Browser hart neu laden (`Strg+F5`). Dashboard bearbeiten → **Karte hinzufügen → Nach Karte → Community-Karten → News Ticker Card**.
7. Quellen im grafischen Editor eintragen und **Prüfen** drücken.

## Manuelle Installation

`custom_components/news_ticker` vollständig nach `/config/custom_components/news_ticker` kopieren; anschließend Schritte 3–7 befolgen. **Nicht** denselben Integrationsordner parallel manuell und über HACS verwalten.

## Update

Nach einem HACS-Update ist bei geänderten Python-Dateien ein **Home Assistant Core Neustart** nötig. Die JavaScript-Ressourcen-URL sollte bei einer neuen Version auf den neuen `?v=`-Wert umgestellt und das Dashboard neu geladen werden. Die bestehenden Feeds liegen in der Kartenkonfiguration und sollten beim Update erhalten bleiben.

## Hinweise und Fehlerdiagnose

- Wenn der Karteneditor die News Ticker Card nicht zeigt: Ressource und Browserkonsole prüfen. Manche andere Custom Cards ersetzen `window.customCards` und stören damit die HA-Kartenauswahl. Diese Integration ändert intern keine Picker-Funktionen.
- Wenn `Keine Schlagzeilen` erscheint: Im Editor die Quelle auf **Prüfen** testen; Home-Assistant-Protokolle nach `news_ticker` durchsuchen.
- Die Integration erlaubt nur öffentliche HTTP(S)-Feeds auf Standardports; private IPs/LAN-Feeds sind blockiert.
- Einige Nachrichtenquellen liefern beschädigtes XML. Der Parser rettet nach Möglichkeit lesbare Einträge; nicht alle Fehler können automatisch korrigiert werden.

Beispiel-YAML: [examples/card.yaml](../examples/card.yaml). Zum Testen mehrerer Home-Assistant-Installationen: [Testprotokoll](TESTING.de.md).

**Hinweis:** Noch nicht offiziell im HACS-Standardkatalog gelistet. Freiwillige Unterstützung per Buy Me a Coffee kann später ergänzt werden; aktuell kein aktiver Spendenlink.

## Projekt unterstützen ☕

Wenn dir News Ticker gefällt, kannst du das Projekt freiwillig auf [Buy Me a Coffee](https://buymeacoffee.com/homeassi82vk) unterstützen. Die Integration bleibt kostenlos.
