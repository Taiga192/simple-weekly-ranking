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

## Cloudflare Pages (kostenloses Hosting)

Neben dem Node-Server läuft die App auch auf Cloudflare Pages mit D1 als Datenbank. `public/` wird statisch ausgeliefert, `functions/api/` ersetzt `server.js`.

1. **D1-Datenbank** `rangliste` anlegen und `schema.sql` in der D1-Console ausführen (oder `npx wrangler d1 execute rangliste --remote --file=schema.sql`).
2. Die **Datenbank-ID** in `wrangler.toml` bei `database_id` eintragen.
3. **Pages-Projekt** aus dem GitHub-Repo erstellen: Build-Befehl leer lassen, Ausgabeverzeichnis `public`.
4. Unter *Settings → Variables and Secrets* das Secret **`IMPORT_PASSWORD`** setzen. Ohne dieses Secret ist der Import gesperrt.
5. Beim ersten Aufruf ist die Rangliste leer. Über **CSV importieren** (Passwort wird abgefragt) die Daten einspielen.

Lokal testen: `npx wrangler d1 execute rangliste --local --file=schema.sql`, dann `npx wrangler pages dev public --binding IMPORT_PASSWORD=geheim`.

Der Node-Server (`npm start`, Docker) bleibt unverändert nutzbar und verlangt kein Passwort.
