# Wochenrangliste

Eine kleine Ranglisten-Webseite mit Node.js 24, SQLite und CSV-Import. Beim ersten Start werden die Spieler aus `data/rangliste.csv` geladen. Weitere Exporte lassen sich über **CSV importieren** einlesen; die vorhandene Rangliste wird dabei atomar ersetzt.

Punkte werden aus Montag bis Samstag neu berechnet. Excel-Formeln in den abgeleiteten CSV-Spalten werden ignoriert. Leere Tageswerte bleiben leer und zählen nicht in Summe oder Tagesdurchschnitt. Die Rangfolge richtet sich nach der Gesamtpunktzahl. Das Tagesziel beträgt 2.300.000 Punkte.

## Lokal starten

Voraussetzung ist Node.js 24.

```sh
npm install
npm start
```

Anschließend `http://localhost:3000` öffnen. Die SQLite-Datenbank wird unter `data/rangliste.sqlite` angelegt. Mit `npm test` laufen die Importtests.

## Docker

```sh
docker compose up --build -d
```

Die Anwendung ist dann unter `http://localhost:3000` erreichbar. `./data` wird nach `/app/data` eingebunden; dadurch bleiben Datenbank und CSV auch beim Neuerstellen des Containers erhalten. Die CSV-Datei kann dort vor dem ersten Start ersetzt werden. `PORT` und `DATABASE_PATH` können als Umgebungsvariablen angepasst werden.

## CSV-Format

Die Datei muss Semikolon-getrennt sein und die Spalten `Name`, `Montag Punkte`, `Dienstag Punkte`, `Mittwoch Punkte`, `Donnerstag Punkte`, `Freitag Punkte` und `Samstag Punkte` enthalten. Die übrigen Spalten des gelieferten Exports werden nicht zur Berechnung verwendet.