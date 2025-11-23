// ===== Basic config =====
const YEAR = new Date().getFullYear();
const STORAGE_KEY = `habitHeatmapData-${YEAR}`;
const THEME_STORAGE_KEY = "habitHeatmapTheme";

// --- Theme helpers ---

function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("theme-dark");
  } else {
    document.body.classList.remove("theme-dark");
  }
}

function updateThemeToggleLabel(theme) {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const icon = btn.querySelector(".theme-toggle-icon");
  const text = btn.querySelector(".theme-toggle-text");

  if (theme === "dark") {
    if (icon) icon.textContent = "☀️";
    if (text) text.textContent = "Light";
  } else {
    if (icon) icon.textContent = "🌙";
    if (text) text.textContent = "Dark";
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const theme = saved === "dark" ? "dark" : "light";
  applyTheme(theme);
  updateThemeToggleLabel(theme);
}

function toggleTheme() {
  const isDark = document.body.classList.contains("theme-dark");
  const next = isDark ? "light" : "dark";
  applyTheme(next);
  updateThemeToggleLabel(next);
  localStorage.setItem(THEME_STORAGE_KEY, next);
}


// Comes from config.js if present
const FUNCTION_URL =
  typeof AZURE_FUNCTION_URL !== "undefined" && AZURE_FUNCTION_URL
    ? AZURE_FUNCTION_URL
    : null;

let habitData = {}; // { "YYYY-MM-DD": true/false }

// ===== Utilities =====

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isToday(date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    console.error("Failed to parse habit data from localStorage", err);
    return {};
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habitData));
  } catch (err) {
    console.error("Failed to save habit data to localStorage", err);
  }
}

function calculateCompletedCount() {
  return Object.values(habitData).filter(Boolean).length;
}

function calculateCurrentStreak() {
  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 400; i++) {
    // up to a bit more than a year back
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getFullYear() !== YEAR) break;

    const key = formatDate(d);
    const done = !!habitData[key];

    if (done) {
      streak++;
    } else {
      // streak breaks at the first non-completed day
      break;
    }
  }

  return streak;
}

// ===== Grid rendering =====

function handleDayClick(event) {
  const cell = event.currentTarget;
  const dateStr = cell.dataset.date;
  if (!dateStr) return;

  const isCompleted = !!habitData[dateStr];
  const newValue = !isCompleted;

  habitData[dateStr] = newValue;
  if (newValue) {
    cell.classList.add("completed");
  } else {
    cell.classList.remove("completed");
  }

  saveToLocalStorage();
  updateSummary();
}

function renderGrid() {
  const gridEl = document.getElementById("grid");
  if (!gridEl) return;

  gridEl.innerHTML = "";

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  for (let month = 0; month < 12; month++) {
    const monthRow = document.createElement("div");
    monthRow.className = "month-row";

    const label = document.createElement("div");
    label.className = "month-label";
    label.textContent = monthNames[month];

    const monthGrid = document.createElement("div");
    monthGrid.className = "month-grid";

    for (let day = 1; day <= 31; day++) {
      const cell = document.createElement("div");
      cell.className = "day-cell";

      const candidateDate = new Date(YEAR, month, day);
      const isValid = candidateDate.getMonth() === month;

      if (!isValid) {
        // e.g. Feb 30
        cell.classList.add("disabled");
      } else {
        const dateStr = formatDate(candidateDate);
        cell.dataset.date = dateStr;
        cell.title = dateStr;

        if (habitData[dateStr]) {
          cell.classList.add("completed");
        }

        if (isToday(candidateDate)) {
          cell.classList.add("today");
        }

        cell.addEventListener("click", handleDayClick);
      }

      monthGrid.appendChild(cell);
    }

    monthRow.appendChild(label);
    monthRow.appendChild(monthGrid);
    gridEl.appendChild(monthRow);
  }
}

// ===== Summary =====

function updateSummary() {
  const yearEl = document.getElementById("summary-year");
  const completedEl = document.getElementById("summary-completed");
  const streakEl = document.getElementById("summary-streak");

  if (yearEl) yearEl.textContent = YEAR;
  if (completedEl) completedEl.textContent = calculateCompletedCount();
  if (streakEl) streakEl.textContent = calculateCurrentStreak();
}

// ===== PNG export (html2canvas) =====

async function handleDownloadPng() {
  const wrapper = document.getElementById("grid-wrapper");
  if (!wrapper) return;

  if (typeof html2canvas === "undefined") {
    alert("PNG export library (html2canvas) not loaded.");
    return;
  }

  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: "#020617",
      scale: window.devicePixelRatio || 2,
    });

    const link = document.createElement("a");
    link.download = `habit-heatmap-${YEAR}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error("Failed to export PNG", err);
    alert("Failed to generate PNG. Please try again.");
  }
}

// ===== CSV export =====

function handleDownloadCsv() {
  const rows = [["date", "completed"]];

  const start = new Date(YEAR, 0, 1);
  const end = new Date(YEAR, 11, 31);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    const value = habitData[dateStr] ? "1" : "0";
    rows.push([dateStr, value]);
  }

  const csvContent = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `habit-heatmap-${YEAR}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ===== Cloud backup / restore (to be wired with Azure Function) =====

async function handleBackupToCloud() {
  if (!FUNCTION_URL) {
    alert("Cloud backup is not configured yet. Set AZURE_FUNCTION_URL in config.js.");
    return;
  }

  const payload = {
    year: YEAR,
    data: habitData,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Backup failed", await res.text());
      alert("Cloud backup failed. Check the function logs.");
      return;
    }

    alert("Backup saved to cloud 🎉");
  } catch (err) {
    console.error("Backup error", err);
    alert("Could not reach the backup service.");
  }
}

async function handleRestoreFromCloud() {
  if (!FUNCTION_URL) {
    alert("Cloud restore is not configured yet. Set AZURE_FUNCTION_URL in config.js.");
    return;
  }

  try {
    const url = `${FUNCTION_URL}?year=${YEAR}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      console.error("Restore failed", await res.text());
      alert("Cloud restore failed. Check the function logs.");
      return;
    }

    const payload = await res.json();
    if (!payload || !payload.data) {
      alert("No backup data found for this year.");
      return;
    }

    habitData = payload.data || {};
    saveToLocalStorage();
    renderGrid();
    updateSummary();

    alert("Habit data restored from cloud ✅");
  } catch (err) {
    console.error("Restore error", err);
    alert("Could not reach the restore service.");
  }
}

// ===== Bootstrapping =====

document.addEventListener("DOMContentLoaded", () => {
    // Theme
    initTheme();
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", toggleTheme);
    }
  
    // Habit grid
    habitData = loadFromLocalStorage();
    renderGrid();
    updateSummary();
  
    const pngBtn = document.getElementById("btn-download-png");
    const csvBtn = document.getElementById("btn-download-csv");
    const backupBtn = document.getElementById("btn-backup");
    const restoreBtn = document.getElementById("btn-restore");
  
    if (pngBtn) pngBtn.addEventListener("click", handleDownloadPng);
    if (csvBtn) csvBtn.addEventListener("click", handleDownloadCsv);
    if (backupBtn) backupBtn.addEventListener("click", handleBackupToCloud);
    if (restoreBtn) restoreBtn.addEventListener("click", handleRestoreFromCloud);
  });
  
