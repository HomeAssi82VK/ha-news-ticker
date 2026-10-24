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

## Beta-Installation über ein benutzerdefiniertes HACS-Repository

**News Ticker ist noch nicht im offiziellen HACS-Katalog gelistet.** Für die Beta können Tester das öffentliche GitHub-Projekt aber als **benutzerdefiniertes Repository** zu HACS hinzufügen und spätere GitHub-Releases über HACS aktualisieren.

1. In **HACS → Drei-Punkte-Menü → Benutzerdefinierte Repositories** gehen.
2. Diese **konkrete Repository-Adresse** eintragen:

   ```text
   https://github.com/HomeAssi82VK/ha-news-ticker
   ```

3. Als Kategorie **Integration** auswählen und hinzufügen.
4. **News Ticker** in HACS installieren und **Home Assistant Core neu starten**.
5. Unter **Einstellungen → Geräte & Dienste → Integration hinzufügen** die Integration **News Ticker** einrichten.
6. Unter **Einstellungen → Dashboards → Ressourcen** diese Adresse als **JavaScript-Modul** hinzufügen:

   ```text
   /news_ticker/news-ticker-card.js?v=1.0.6-beta.7
   ```

7. Browser mit **Strg + F5** neu laden. Dashboard bearbeiten → **Karte hinzufügen → Nach Karte → Community-Karten → News Ticker Card**. RSS-Quellen im grafischen Editor eintragen.

**Warum Integration und Ressource?** Die Integration lädt RSS-Inhalte vom Server; die Dashboard-Ressource lädt die grafische Karte. Beides ist derzeit notwendig.

## Manuelle Installation (ohne HACS)

1. Den GitHub-Quellcode als ZIP herunterladen und entpacken.
2. `custom_components/news_ticker` vollständig nach `/config/custom_components/news_ticker` kopieren.
3. **Home Assistant Core neu starten**.
4. **Einstellungen → Geräte & Dienste → Integration hinzufügen → News Ticker** wählen.
5. Unter **Einstellungen → Dashboards → Ressourcen** `/news_ticker/news-ticker-card.js?v=1.0.6-beta.7` als **JavaScript-Modul** eintragen.
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

Wenn dir News Ticker gefällt, kannst du das Projekt freiwillig auf [Buy Me a Coffee](https://buymeacoffee.com/homeassi82vk) unterstützen. Die Integration bleibt kostenlos.
