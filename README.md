# Habit Heatmap — FE Micro + Cloud Backup

![Status](https://img.shields.io/badge/status-active-brightgreen.svg)
![Stack](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20AzureFunctions-blue.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

> Habit Heatmap is a small front-end–first project where I rebuilt a GitHub-style contribution grid in vanilla HTML/CSS/JavaScript, wired it to localStorage for offline habit tracking, and then added PNG/CSV export plus a lightweight backup/restore flow using an Azure HTTP Function and Azure Blob Storage. It’s designed to be easy to demo and easy to explain in interviews: UI state lives in the browser, and the cloud piece is a single function that just stores JSON snapshots in Blob.

---

## 🌐 Overview

**Habit Heatmap** is a small, interview-friendly project that shows:

- A GitHub-style habit grid built with **plain HTML/CSS/JS**
- Habit data persisted in the browser via **`localStorage`**
- Export to **PNG** (via `html2canvas`) and **CSV**
- A minimal **Azure HTTP Function** that saves/loads JSON snapshots to **Blob Storage**

---

## 🧱 Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Export:** `html2canvas` for PNG, simple CSV builder in JS
- **Storage (local):** `localStorage` per year (`habitHeatmapData-YYYY`)
- **Backend:** Azure Functions (HTTP trigger, Python)
- **Cloud storage:** Azure Blob Storage (one JSON blob per year)

---

## ✨ Features

- 🟩 **GitHub-style grid**
  - 12 × 31 layout (months × days)
  - Each square = one day; click to toggle **done / not done**
- 💾 **Browser persistence**
  - Habit state stored in `localStorage` for the current year
  - Survives refresh and works offline
- 📊 **Summary & streak**
  - Shows current year, total completed days, and current streak (consecutive days up to today)
- 🖼️ **PNG export**
  - Uses `html2canvas` to capture the grid/card
  - Downloads a PNG like `habit-heatmap-2025.png`
- 📄 **CSV export**
  - Outputs `date,completed` rows for the full year (`1` = done, `0` = not done)
- ☁️ **Cloud backup & restore**
  - **Back up to cloud** → POST `{ year, data, timestamp }` to an Azure HTTP Function
  - Function writes JSON to Azure Blob as `habit-<year>.json`
  - **Restore from cloud** → GET from the same function and repopulate the grid
  - No full backend app – just **Function → Blob**

---

## 🏗️ High-Level Architecture

```text
Browser (HTML/CSS/JS)
   |
   |  JSON { year, data, timestamp }
   v
Azure Function (HTTP, Python)
   |
   v
Azure Blob Storage (habit-YYYY.json)
```

- UI state lives entirely in the browser.
- Backup/restore is handled by a single HTTP Function.
- Blob Storage is used as a simple JSON snapshot store.

---

## 🚀 Getting Started (Local)
1. Clone the repo:
```
git clone https://github.com/devSharma31/habit-heatmap-azure.git
cd habit-heatmap-azure
```
2. Run the Azure Function (backend)

Requirements:
- Python 3.x
- Azure Functions Core Tools
- Azurite (for local Blob emulation) or a real Azure Storage account

From the function/ folder:
```
cd function

# (optional) create a virtualenv
python -m venv .venv
# Windows:
.venv\Scripts\activate

pip install -r requirements.txt
```
function/local.settings.json is already configured for local development using the Azurite devstore connection string.

Start Azurite (in another terminal):
```
azurite
```
Then start the function app:
```
func start --port 7072
```
You should see:
Functions:

    HabitSync: [GET,POST] http://localhost:7072/api/HabitSync


## 3. Run the frontend:

From the frontend/ folder:
```
cd ../frontend
```

Any static server works (VS Code Live Server, serve, http-server, etc.). Example with serve:
```
npm install -g serve
serve .
```

Then open the URL it prints (e.g. http://localhost:3000).

frontend/config.js already points to:
```
const AZURE_FUNCTION_URL = "http://localhost:7072/api/HabitSync";
```
So backup/restore will work as soon as the function is running.

---


## 🕹️ How to Use

1. Open the app in your browser.
2. Click on days in the grid to mark them as done.
3. Watch the summary update (Completed days + Current streak).
4. Use:
  - Download PNG → snapshot of the grid/card
  - Download CSV → raw data for Excel/Sheets
  - Back up to cloud → save current year’s state to Blob
  - Restore from cloud → pull back the latest snapshot for that year


## 📜 License

This project is licensed under the MIT License – see the LICENSE file for details.

