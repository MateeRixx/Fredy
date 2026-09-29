# 🕵️‍♂️ Fredy

**A Local Demo App for Financial Fraud Detection**

Fredy is a hands-on, local demonstration application designed to help you spot suspicious financial transactions. It provides a simple, unified workspace that takes you through the entire machine learning lifecycle:

**Generate sample data → Train a fraud detection model → Score transactions → Review analyst alerts**

> ⚠️ **Disclaimer:** Fredy is designed strictly for learning and demonstrations. **Do not use it with real financial data** without implementing production-grade security, privacy, and storage controls.

---

## 🚀 Quick Start

The recommended way to run Fredy is with **Docker Desktop**.

### Prerequisites

* [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Prepare Docker

Open Docker Desktop and wait until it shows that Docker is running.

### 2. Configure Environment

Open PowerShell in the project folder and create your private environment file:

```powershell
Copy-Item .env.example .env
```

Open `.env` in a text editor and configure the email and password used for the login page.

### 3. Launch the App

Start the application using Docker Compose:

```powershell
docker compose up -d --build
```

> 💡 The first startup may take a few minutes because Docker needs to download and build the required dependencies. Later startups will be much faster.

### 4. Access the Dashboard

Open http://localhost in your browser and sign in.

---

## 🛑 Stopping the App

When you're finished, stop the application with:

```powershell
docker compose down
```

---

## 💡 How to Use Fredy

Once you are logged into the Fredy workspace, follow this workflow:

### 🗄️ Command

Navigate to the **Command** section to generate a sample transaction dataset.

### 🧠 Model

Go to the **Model** section and train the fraud detection model using the generated data.

### 💳 Transactions

Enter transaction details and select **Score Transaction** to evaluate a transaction.

### 📊 Risk Results

The transaction will receive a risk classification:

| Indicator | Risk Level           |
| --------- | -------------------- |
| 🟢 Green  | Low Risk             |
| 🟠 Amber  | Medium Risk          |
| 🔴 Red    | High / Critical Risk |

### 🚨 Alerts

Use the **Alerts** tab to review and resolve transactions that have been flagged as suspicious.

### ❌ Input Validation

If an entry is invalid, Fredy explains exactly which field needs to be corrected.

For example:

```text
amount: Input should be a valid number
```

---

## ⚙️ Alternate Setup

If Docker is not available, Fredy can also be run manually.

### Prerequisites

* Python 3.11
* Node.js

### 1. Create a Python Virtual Environment

```powershell
py -3.11 -m venv .venv
```

### 2. Install Python Dependencies

```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```powershell
npm.cmd --prefix frontend install
```

### 4. Build the Frontend

```powershell
npm.cmd --prefix frontend run build
```

### 5. Start the Server

```powershell
.venv\Scripts\python.exe run_server.py
```

Access the application at:

http://127.0.0.1:8000

---

## ✅ Verify Installation

If Fredy is running with Docker, verify that the services are responding correctly:

```powershell
Invoke-WebRequest http://localhost
```

```powershell
Invoke-WebRequest http://localhost:8000/api/health
```

Both requests should return a **200 status code**.

---

## 📁 Project Structure

```text
fredy/
├── app/         # Backend API and fraud-detection logic
├── frontend/    # React frontend application
├── tests/       # Automated tests and unit tests
├── data/        # Sample data and data helpers
├── docs/        # Optional technical documentation
└── docker/      # Docker configuration and container files
```

---

## 💻 Development

To run the automated test suite locally:

```powershell
.venv\Scripts\python.exe -m pytest -q
```

This runs the project's automated checks and unit tests.

---

## 🔒 Security

Fredy uses a `.env` file to store local configuration and login credentials.

The `.env` file is intentionally ignored by Git.

**Never commit or share your `.env` file.**

Make sure your credentials remain private, especially if the project is being pushed to a public repository.

---

## ⚠️ Important Disclaimer

Fredy is a **local demonstration and learning project**.

It is **not intended for production financial fraud detection**.

Before using a system like Fredy with real financial data, additional controls would be required, including:

* Secure data storage
* Authentication and authorization
* Encryption
* Secrets management
* Audit logging
* Data privacy controls
* Model monitoring
* Production-grade infrastructure
* Appropriate regulatory and compliance controls
