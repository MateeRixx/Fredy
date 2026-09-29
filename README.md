# Fredy

Fredy is a local demo app that helps you spot suspicious financial
transactions. It gives you one simple workspace to create sample data, train a
fraud model, score a transaction, and review alerts.

It is designed for learning and demonstrations. Do not use it with real
financial data without adding production security and storage controls.

## Start it (recommended)

You only need [Docker Desktop](https://www.docker.com/products/docker-desktop/).

1. Open Docker Desktop and wait until it says it is running.
2. Open PowerShell in this project folder.
3. Create your private settings file:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Open `.env` and choose an email and password for the login page.
5. Start the app:

   ```powershell
   docker compose up -d --build
   ```

6. Open [http://localhost](http://localhost) in your browser and sign in.

The first start can take a few minutes because Docker downloads the required
tools. Later starts are much faster.

To stop the app:

```powershell
docker compose down
```

## What to do in the app

1. On **Command**, create a sample dataset.
2. On **Model**, train the fraud model.
3. On **Transactions**, enter values and select **Score Transaction**.
4. Read the risk result: green is low risk, amber is medium risk, and red is
   high or critical risk.
5. Use **Alerts** to review and resolve suspicious transactions.

If an entry is invalid, the app now explains the exact field that needs fixing,
such as `amount: Input should be a valid number`.

## If Docker is not available

Install Python 3.11 and Node.js, then run these commands in PowerShell:

```powershell
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
npm.cmd --prefix frontend install
npm.cmd --prefix frontend run build
.venv\Scripts\python.exe run_server.py
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Check that it is working

With Docker running, these commands should both return `200`:

```powershell
Invoke-WebRequest http://localhost
Invoke-WebRequest http://localhost:8000/api/health
```

## Project map

```text
app/         Backend and fraud-detection logic
frontend/    Website shown in the browser
tests/       Automated checks
data/        Small sample data and data helpers
docs/        Optional technical documentation
docker/      Files Docker uses to run the app
```

## For developers

Run the automated tests:

```powershell
.venv\Scripts\python.exe -m pytest -q
```

## Keep your login safe

Your `.env` file contains your login details. It is intentionally ignored by
Git, so do not share or commit it.

## License

MIT — see [LICENSE](LICENSE).
