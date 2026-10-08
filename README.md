# Weekly Ranking

A small ranking web page built with Node.js 24, SQLite and CSV import. On first start the players are loaded from `data/rangliste.csv`. Further exports can be loaded with **Import CSV**; the existing ranking is replaced atomically.

Points are recalculated from Monday to Saturday. Excel formulas in the derived CSV columns are ignored. Empty daily values stay empty and do not count towards the total or the daily average. Players are ranked by total points. The daily target is 2,300,000 points.

## Run locally

Requires Node.js 24.

```sh
npm install
npm start
```

Then open `http://localhost:3000`. The SQLite database is created at `data/rangliste.sqlite`. `npm test` runs the import tests.

## Docker

```sh
docker compose up --build -d
```

The app is then available at `http://localhost:3000`. `./data` is mounted at `/app/data`, so the database and CSV survive rebuilding the container. The CSV file can be replaced there before the first start. `PORT` and `DATABASE_PATH` can be set as environment variables.

## CSV format

The file must be semicolon-separated and contain the columns `Name`, `Montag Punkte`, `Dienstag Punkte`, `Mittwoch Punkte`, `Donnerstag Punkte`, `Freitag Punkte` and `Samstag Punkte`. The other columns of the export are not used for calculation.

## Cloudflare Pages (free hosting)

Besides the Node server, the app also runs on Cloudflare Pages with D1 as the database. `public/` is served statically and `functions/api/` replaces `server.js`.

1. Create a **D1 database** named `rangliste` and run `schema.sql` in the D1 console (or `npx wrangler d1 execute rangliste --remote --file=schema.sql`).
2. Enter the **database ID** in `wrangler.toml` under `database_id`.
3. Create a **Pages project** from the GitHub repo: build command `npm ci`, output directory `public`.
4. Under *Settings → Variables and Secrets* set the secret **`IMPORT_PASSWORD`**. Without it, import is disabled.
5. The ranking is empty on first load. Use **Import CSV** (you will be asked for the password) to load the data.

Test locally: `npx wrangler d1 execute rangliste --local --file=schema.sql`, then `npx wrangler pages dev public --binding IMPORT_PASSWORD=secret`.

The Node server (`npm start`, Docker) keeps working unchanged and does not ask for a password.
