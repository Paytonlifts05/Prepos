/* ============================================================================
   APP.JS - Main application orchestration & event delegation
   ============================================================================ */

// ============ INITIALIZATION ============

/**
 * Initialize the entire application
 */
function initializeApp() {
  console.log("🏋️ Initializing Payton PrepOS...");

  // Setup UI rendering
  renderAll();

  // Setup tab navigation
  setupTabNavigation();

  // Setup today tab (check-in, water, meals)
  setupTodayTab();

  // Setup workout tab
  setupWorkoutDays();

  // Setup progress tab
  setupProgressTab();

  // Setup settings tab
  setupSettingsTab();

  // Setup header
  setupHeader();

  // Setup data export/import
  setupDataExport();

  // Setup service worker for offline support
  setupServiceWorker();

  console.log("✅ PrepOS initialized successfully");
}

// ============ TAB NAVIGATION ============

/**
 * Setup tab switching with event delegation
 */
function setupTabNavigation() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;
      if (!tabName) return;

      // Remove active class from all tabs and panels
      document.querySelectorAll(".tab, .tab-panel").forEach((el) => {
        el.classList.remove("active");
      });

      // Add active class to clicked tab and corresponding panel
      tab.classList.add("active");
      const panel = document.getElementById(tabName);
      if (panel) {
        panel.classList.add("active");
        // Redraw chart if progress tab is opened
        if (tabName === "progress") {
          drawChart();
        }
      }
    });
  });
}

// ============ TODAY TAB SETUP ============

/**
 * Setup all event listeners for today tab
 */
function setupTodayTab() {
  // Save check-in button
  const saveCheckinBtn = document.getElementById("saveCheckin");
  if (saveCheckinBtn) {
    saveCheckinBtn.addEventListener("click", () => {
      const weight = document.getElementById("weightInput").value;
      const sleep = document.getElementById("sleepInput").value;
      const steps = document.getElementById("stepsInput").value;

      StateStore.saveCheckin(weight, sleep, steps);
      StateStore.showToast("Check-in saved", "success");
    });
  }

  // Water control buttons (event delegation)
  document.querySelectorAll("[data-water]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const amount = Number(btn.dataset.water);
      StateStore.addWater(amount);
    });
  });

  // Reset water button
  const resetWaterBtn = document.getElementById("resetWater");
  if (resetWaterBtn) {
    resetWaterBtn.addEventListener("click", () => {
      StateStore.resetWater();
      StateStore.showToast("Water reset", "success");
    });
  }
}

// ============ WORKOUT TAB SETUP ============

/**
 * Setup workout tab event listeners
 */
function setupWorkoutTab() {
  const saveWorkoutBtn = document.getElementById("saveWorkout");
  if (saveWorkoutBtn) {
    saveWorkoutBtn.addEventListener("click", () => {
      const workoutDay = document.getElementById("workoutDay").value;
      if (!workoutDay) {
        StateStore.showToast("Select a workout day", "error");
        return;
      }

      // Collect exercise data
      const exercises = Array.from(document.querySelectorAll(".exercise")).map((div) => {
        const inputs = div.querySelectorAll("input");
        return {
          weight: inputs[0].value || "",
          r1: inputs[1].value || "",
          r2: inputs[2].value || "",
          r3: inputs[3].value || ""
        };
      });

      StateStore.saveWorkout(workoutDay, exercises);
      StateStore.showToast("Workout saved", "success");
    });
  }
}

// ============ PROGRESS TAB SETUP ============

/**
 * Setup progress tab event listeners
 */
function setupProgressTab() {
  const clearWeightBtn = document.getElementById("clearWeight");
  if (clearWeightBtn) {
    clearWeightBtn.addEventListener("click", () => {
      if (confirm("Clear all saved weight data? This cannot be undone.")) {
        StateStore.clearWeightData();
        drawChart();
        StateStore.showToast("Weight data cleared", "success");
      }
    });
  }

  setupDataExport();
}

// ============ SETTINGS TAB SETUP ============

/**
 * Setup settings tab event listeners
 */
function setupSettingsTab() {
  // Save targets
  const saveTargetsBtn = document.getElementById("saveTargets");
  if (saveTargetsBtn) {
    saveTargetsBtn.addEventListener("click", () => {
      const water = document.getElementById("waterGoalInput").value;
      const steps = document.getElementById("stepGoalInput").value;
      const showDate = document.getElementById("showDateInput").value;

      StateStore.updateTargets(water, steps, showDate);
      StateStore.showToast("Targets updated", "success");
    });
  }

  // Add meal
  const addMealBtn = document.getElementById("addMeal");
  if (addMealBtn) {
    addMealBtn.addEventListener("click", () => {
      StateStore.addMeal();
    });
  }

  // Save meals
  const saveMealsBtn = document.getElementById("saveMeals");
  if (saveMealsBtn) {
    saveMealsBtn.addEventListener("click", () => {
      const mealEdits = document.querySelectorAll(".meal-edit");
      const meals = Array.from(mealEdits).map((div) => ({
        name: div.querySelector("[data-name]").value || "Unnamed",
        details: div.querySelector("[data-detail]").value || ""
      }));

      StateStore.updateMeals(meals);
      StateStore.showToast("Meals updated", "success");
    });
  }

  // Save notes
  const saveNotesBtn = document.getElementById("saveNotes");
  if (saveNotesBtn) {
    saveNotesBtn.addEventListener("click", () => {
      const notes = document.getElementById("notesInput").value;
      StateStore.updateNotes(notes);
      StateStore.showToast("Notes saved", "success");
    });
  }
}

// ============ HEADER SETUP ============

/**
 * Setup header and install button
 */
function setupHeader() {
  // PWA install prompt
  let deferredPrompt;
  const installBtn = document.getElementById("installBtn");

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installBtn) {
      installBtn.classList.remove("hidden");
    }
  });

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        deferredPrompt = null;
        installBtn.classList.add("hidden");
      }
    });
  }
}

// ============ SERVICE WORKER SETUP ============

/**
 * Register service worker for offline support
 */
function setupServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .then((registration) => {
        console.log("✓ Service Worker registered:", registration);
      })
      .catch((error) => {
        console.warn("Service Worker registration failed:", error);
      });
  }
}

// ============ STATE SUBSCRIPTION ============

/**
 * Subscribe to state changes and re-render UI
 */
function setupStateSubscription() {
  StateStore.subscribe(() => {
    renderAll();
  });
}

// ============ DOCUMENT READY ============

/**
 * Wait for DOM to be ready before initializing
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
