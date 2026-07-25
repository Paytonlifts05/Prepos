/* ============================================================================
   UI COMPONENTS - Reusable rendering functions organized by domain
   ============================================================================ */

// ============ UTILITY FUNCTIONS ============

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str = "") {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return String(str).replace(/[&<>"']/g, char => map[char]);
}

/**
 * Format date to readable format (e.g., "Friday, July 25")
 */
function formatDate(dateString = new Date().toISOString().slice(0, 10)) {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

/**
 * Calculate days until show date
 */
function calculateDaysUntilShow(showDate) {
  const diff = Math.ceil(
    (new Date(showDate + "T12:00:00") - new Date()) / 86400000
  );
  return diff;
}

// ============ TODAY TAB - MEALS ============

/**
 * Render meal checkboxes
 */
function renderMeals() {
  const log = StateStore.getToday();
  const host = document.getElementById("mealList");
  const state = StateStore.state;

  host.innerHTML = "";
  let completed = 0;

  state.meals.forEach((meal, index) => {
    const isChecked = log.meals[index];
    if (isChecked) completed++;

    const label = document.createElement("label");
    label.className = `check-row ${isChecked ? "done" : ""}`;
    label.innerHTML = `
      <input type="checkbox" ${isChecked ? "checked" : ""} />
      <span>
        <strong>${escapeHtml(meal.name)}</strong>
        <small>${escapeHtml(meal.details)}</small>
      </span>
    `;

    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", (e) => {
      StateStore.setMealChecked(index, e.target.checked);
    });

    host.appendChild(label);
  });

  // Update meal counter
  document.getElementById("mealCount").textContent = `${completed}/${state.meals.length}`;
}

// ============ TODAY TAB - TASKS ============

/**
 * Render prep task checkboxes
 */
function renderTasks() {
  const log = StateStore.getToday();
  const host = document.getElementById("taskList");

  host.innerHTML = "";

  PREP_TASKS.forEach(([taskKey, taskLabel]) => {
    const isChecked = log.tasks[taskKey];

    const label = document.createElement("label");
    label.className = `check-row ${isChecked ? "done" : ""}`;
    label.innerHTML = `
      <input type="checkbox" ${isChecked ? "checked" : ""} />
      <span>
        <strong>${escapeHtml(taskLabel)}</strong>
      </span>
    `;

    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", (e) => {
      StateStore.setTaskChecked(taskKey, e.target.checked);
    });

    host.appendChild(label);
  });
}

// ============ TODAY TAB - CHECK-IN & WATER ============

/**
 * Render today's input values (weight, sleep, steps)
 */
function renderTodayInputs() {
  const log = StateStore.getToday();
  const state = StateStore.state;

  document.getElementById("weightInput").value = log.weight || "";
  document.getElementById("sleepInput").value = log.sleep || "";
  document.getElementById("stepsInput").value = log.steps || "";

  // Update water display
  document.getElementById("waterTotal").textContent = `${log.water || 0} oz`;
  document.getElementById("waterGoalLabel").textContent = state.targets.water;

  // Update water progress bar
  const waterPercent = Math.min(100, (log.water || 0) / state.targets.water * 100);
  document.getElementById("waterBar").style.width = `${waterPercent}%`;
}

// ============ TODAY TAB - SCORE CALCULATION ============

/**
 * Calculate and display daily prep score
 */
function calculateScore() {
  const log = StateStore.getToday();
  const state = StateStore.state;

  const mealTotal = state.meals.length || 1;
  const mealScore = Object.values(log.meals).filter(Boolean).length / mealTotal;
  const taskScore = PREP_TASKS.filter(([k]) => log.tasks[k]).length / PREP_TASKS.length;
  const waterScore = Math.min(1, (log.water || 0) / state.targets.water);
  const stepsScore = Math.min(1, (Number(log.steps) || 0) / state.targets.steps);
  const sleepScore = Math.min(1, (Number(log.sleep) || 0) / 8);

  // Weighted calculation: meals 35%, tasks 35%, water 10%, steps 10%, sleep 10%
  const score = Math.round(
    (mealScore * 0.35 + taskScore * 0.35 + waterScore * 0.1 + stepsScore * 0.1 + sleepScore * 0.1) * 100
  );

  document.getElementById("scoreValue").textContent = `${score}%`;
  document.getElementById("scoreRing").style.background = `conic-gradient(var(--accent) ${score}%, #232a33 0)`;
}

// ============ WORKOUT TAB ============

/**
 * Setup workout day dropdown
 */
function setupWorkoutDays() {
  const workoutDay = document.getElementById("workoutDay");
  const state = StateStore.state;
  const days = Object.keys(state.workoutDays);

  workoutDay.innerHTML = days.map(day => `<option>${escapeHtml(day)}</option>`).join("");
  workoutDay.addEventListener("change", renderWorkout);

  renderWorkout();
}

/**
 * Render exercises for selected workout day
 */
function renderWorkout() {
  const state = StateStore.state;
  const log = StateStore.getToday();
  const workoutDay = document.getElementById("workoutDay");
  const dayName = workoutDay.value || Object.keys(state.workoutDays)[0];
  const host = document.getElementById("exerciseList");

  host.innerHTML = "";

  const savedExercises = log.workout[dayName] || [];
  const exercises = state.workoutDays[dayName] || [];

  exercises.forEach((exercise, index) => {
    const saved = savedExercises[index] || {};
    const [name, sets, reps] = exercise;

    const div = document.createElement("div");
    div.className = "exercise";
    div.innerHTML = `
      <div class="exercise-title">${escapeHtml(name)} · ${sets} sets · ${reps}</div>
      <div class="exercise-grid">
        <input type="number" placeholder="Weight (lbs)" value="${saved.weight || ""}" />
        <input type="number" placeholder="Set 1 reps" value="${saved.r1 || ""}" />
        <input type="number" placeholder="Set 2 reps" value="${saved.r2 || ""}" />
        <input type="number" placeholder="Set 3 reps" value="${saved.r3 || ""}" />
      </div>
    `;

    host.appendChild(div);
  });
}

// ============ PROGRESS TAB - HISTORY ============

/**
 * Render recent check-in history
 */
function renderHistory() {
  const host = document.getElementById("historyList");
  const recentCheckins = StateStore.getRecentCheckins(14);

  host.innerHTML = "";

  recentCheckins.forEach(([date, log]) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <span>
        <strong>${date}</strong>
        <small>${log.sleep || "-"} hr sleep · ${log.steps || "-"} steps</small>
      </span>
      <strong>${log.weight || "-"} lb</strong>
    `;
    host.appendChild(div);
  });
}

// ============ PROGRESS TAB - WEIGHT CHART ============

/**
 * Draw weight trend chart on canvas
 */
function drawChart() {
  const canvas = document.getElementById("weightChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  const cssW = canvas.clientWidth || 640;
  const cssH = 280;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, cssW, cssH);

  const weightHistory = StateStore.getWeightHistory(30);
  const data = weightHistory.map(([date, log]) => [date, Number(log.weight)]);

  // Draw grid lines
  ctx.strokeStyle = "#28323d";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = 30 + i * 50;
    ctx.beginPath();
    ctx.moveTo(36, y);
    ctx.lineTo(cssW - 12, y);
    ctx.stroke();
  }

  // Handle insufficient data
  if (data.length < 2) {
    ctx.fillStyle = "#9aa4af";
    ctx.font = "14px sans-serif";
    ctx.fillText("Log at least two weigh-ins to see your trend.", 36, 145);
    return;
  }

  // Calculate scaling
  const weights = data.map(d => d[1]);
  const minWeight = Math.min(...weights) - 1;
  const maxWeight = Math.max(...weights) + 1;

  // Plot points
  const points = weights.map((w, i) => [
    36 + (i * (cssW - 56)) / (weights.length - 1),
    240 - ((w - minWeight) / (maxWeight - minWeight)) * 190
  ]);

  // Draw line
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) {
      ctx.moveTo(p[0], p[1]);
    } else {
      ctx.lineTo(p[0], p[1]);
    }
  });
  ctx.stroke();

  // Draw points
  ctx.fillStyle = "#f5f7fa";
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ============ SETTINGS TAB - TARGETS ============

/**
 * Render target settings inputs
 */
function renderTargetsSettings() {
  const state = StateStore.state;

  document.getElementById("waterGoalInput").value = state.targets.water;
  document.getElementById("stepGoalInput").value = state.targets.steps;
  document.getElementById("showDateInput").value = state.targets.showDate;
}

// ============ SETTINGS TAB - MEALS ============

/**
 * Render meal editor (editable meal list)
 */
function renderMealEditor() {
  const state = StateStore.state;
  const host = document.getElementById("mealEditor");

  host.innerHTML = "";

  state.meals.forEach((meal, index) => {
    const div = document.createElement("div");
    div.className = "meal-edit";
    div.innerHTML = `
      <div>
        <input type="text" placeholder="Meal name" value="${escapeHtml(meal.name)}" data-name data-index="${index}" />
        <input type="text" placeholder="Details" value="${escapeHtml(meal.details)}" data-detail data-index="${index}" />
      </div>
      <button type="button" data-remove="${index}">×</button>
    `;

    const removeBtn = div.querySelector("[data-remove]");
    removeBtn.addEventListener("click", () => {
      StateStore.removeMeal(index);
    });

    host.appendChild(div);
  });
}

// ============ SETTINGS TAB - NOTES ============

/**
 * Render notes editor
 */
function renderNotesSettings() {
  const state = StateStore.state;
  document.getElementById("notesInput").value = state.notes || "";
}

// ============ FOOTER - COUNTDOWN ============

/**
 * Render countdown to show date
 */
function renderCountdown() {
  const state = StateStore.state;
  const daysUntil = calculateDaysUntilShow(state.targets.showDate);

  let countdownText;
  if (daysUntil >= 0) {
    countdownText = `${daysUntil} days until show day`;
  } else {
    countdownText = `Show date passed ${Math.abs(daysUntil)} days ago`;
  }

  document.getElementById("countdown").textContent = countdownText;
}

// ============ HEADER - DATE & INSTALL BUTTON ============

/**
 * Render today's date in header
 */
function renderTodayLabel() {
  document.getElementById("todayLabel").textContent = formatDate();
}

// ============ MASTER RENDER FUNCTION ============

/**
 * Re-render all UI components (called after state changes)
 */
function renderAll() {
  // Header
  renderTodayLabel();

  // Today tab
  renderMeals();
  renderTasks();
  renderTodayInputs();
  calculateScore();

  // Workout tab
  setupWorkoutDays();

  // Progress tab
  renderHistory();
  if (document.getElementById("progress").classList.contains("active")) {
    drawChart();
  }

  // Settings tab
  renderTargetsSettings();
  renderMealEditor();
  renderNotesSettings();

  // Footer
  renderCountdown();
}
