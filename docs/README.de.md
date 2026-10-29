# News Ticker – deutsche Anleitung

**News Ticker v1.1.0** kombiniert eine Home-Assistant-Integration zum RSS-Abruf und eine Dashboard-Karte mit grafischem Editor. Die im Alltag funktionierende Version nutzt **keinen internen Home-Assistant-Katalog-Patch**.

## Funktionen

- Bis zu acht RSS-/Atom-Feeds pro Karte (aktivieren, prüfen, sortieren, entfernen)
- Laufmodi: Endloslauf, Ein-/Ausfahren und Überblenden
- Themes: TV News, Minimal Dark, Transparent und eigene Farben
- Titelfeld: spitz, rund oder gerade; Breite automatisch oder 55-360 px einstellbar
- Schriftgröße, Geschwindigkeit, Uhr, Quellenanzeige, Filter und Aktualisierungsintervall
- Schlagzeilen öffnen die verlinkten Artikel
- Serverbasierter RSS-Abruf mit Cache und Fehlerdiagnose
- Fortlaufender Ticker auch bei nur einer Schlagzeile

## Installation über HACS

1. **HACS** in Home Assistant öffnen und unter **Integrationen** nach **News Ticker** suchen.
2. **News Ticker** installieren und anschließend **Home Assistant Core neu starten**.
3. Unter **Einstellungen → Geräte & Dienste → Integration hinzufügen** die Integration **News Ticker** einrichten.
4. Unter **Einstellungen → Dashboards → Ressourcen** diese Adresse als **JavaScript-Modul** hinzufügen:

   ```text
   /news_ticker/news-ticker-card.js?v=1.1.0
   ```

5. Browser neu laden. Dashboard bearbeiten → **Karte hinzufügen → Nach Karte → Community-Karten → News Ticker Card**. RSS-/Atom-Quellen im grafischen Editor eintragen.

**News Ticker erscheint noch nicht in der HACS-Suche?** Unter **HACS → Benutzerdefinierte Repositories** die Adresse `https://github.com/HomeAssi82VK/ha-news-ticker` mit Kategorie **Integration** hinzufügen, installieren und anschließend bei Schritt 2 weitermachen. Das ist die Alternative, solange der Katalogeintrag nicht verfügbar ist.

**Warum zusätzlich eine Dashboard-Ressource?** Die Integration lädt RSS-Inhalte vom Server; das JavaScript-Modul zeigt die Karte an. Beides ist derzeit notwendig.

## Manuelle Installation (ohne HACS)

1. Den GitHub-Quellcode als ZIP herunterladen und entpacken.
2. `custom_components/news_ticker` vollständig nach `/config/custom_components/news_ticker` kopieren.
3. **Home Assistant Core neu starten**.
4. **Einstellungen → Geräte & Dienste → Integration hinzufügen → News Ticker** wählen.
5. Unter **Einstellungen → Dashboards → Ressourcen** `/news_ticker/news-ticker-card.js?v=1.1.0` als **JavaScript-Modul** eintragen.
6. Browser hart neu laden und die **News Ticker Card** über den Karteneditor hinzufügen.

HACS-Installation und manuelle Installation desselben Integrationsordners nicht mischen.

## Update

Nach einem HACS-Update ist bei geänderten Python-Dateien ein **Home Assistant Core Neustart** nötig. Die JavaScript-Ressourcen-URL sollte bei einer neuen Version auf den neuen `?v=`-Wert umgestellt und das Dashboard neu geladen werden. Die bestehenden Feeds liegen in der Kartenkonfiguration und sollten beim Update erhalten bleiben.

## Hinweise und Fehlerdiagnose

- Wenn der Karteneditor die News Ticker Card nicht zeigt: Ressource und Browserkonsole prüfen. Manche andere Custom Cards ersetzen `window.customCards` und stören damit die HA-Kartenauswahl. Diese Integration ändert intern keine Picker-Funktionen.
- Wenn `Keine Schlagzeilen` erscheint: Im Editor die Quelle auf **Prüfen** testen; Home-Assistant-Protokolle nach `news_ticker` durchsuchen.
- Die Integration erlaubt nur öffentliche HTTP(S)-Feeds auf Standardports; private IPs/LAN-Feeds sind blockiert.
- Einige Nachrichtenquellen liefern beschädigtes XML. Der Parser rettet nach Möglichkeit lesbare Einträge; nicht alle Fehler können automatisch korrigiert werden.

Beispiel-YAML: [examples/card.yaml](../examples/card.yaml). Zum Testen mehrerer Home-Assistant-Installationen: [Testprotokoll](TESTING.de.md).

## Projekt unterstützen ☕

Wenn dir News Ticker gefällt, kannst du das Projekt freiwillig unterstützen. Die Integration bleibt kostenlos.
[![Buy Me a Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/homeassi82vk)
