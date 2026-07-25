/* ============================================================================
   STATE MANAGER - Centralized state & storage logic
   ============================================================================ */

// ============ DEFAULT STATE ============
const DEFAULT_STATE = {
  targets: {
    water: 128,
    steps: 10000,
    showDate: "2026-11-14"
  },
  meals: [
    { name: "Meal 1", details: "Enter your coach meal" },
    { name: "Meal 2", details: "Enter your coach meal" },
    { name: "Meal 3", details: "Enter your coach meal" },
    { name: "Meal 4", details: "Enter your coach meal" },
    { name: "Meal 5", details: "Enter your coach meal" }
  ],
  workoutDays: {
    "Push": [
      ["Incline Press", "3", "8-12"],
      ["Machine Chest Press", "3", "8-12"],
      ["Lateral Raise", "4", "12-20"],
      ["Triceps Pressdown", "3", "10-15"]
    ],
    "Pull": [
      ["Lat Pulldown", "3", "8-12"],
      ["Chest-Supported Row", "3", "8-12"],
      ["Rear Delt Fly", "4", "12-20"],
      ["Cable Curl", "3", "10-15"]
    ],
    "Legs": [
      ["Hack Squat", "4", "6-10"],
      ["Romanian Deadlift", "3", "8-12"],
      ["Leg Press", "3", "10-15"],
      ["Leg Curl", "3", "10-15"],
      ["Calf Raise", "4", "10-15"]
    ],
    "Rest / Cardio": [
      ["Cardio", "1", "Coach target"],
      ["Posing", "1", "15-30 min"]
    ]
  },
  notes: "",
  logs: {}
};

// ============ PREP TASKS ============
const PREP_TASKS = [
  ["training", "Training completed"],
  ["cardio", "Cardio completed"],
  ["posing", "Posing practice"],
  ["supplements", "Supplements taken"],
  ["checkin", "Morning check-in saved"]
];

// ============ STATE MANAGER CLASS ============
class StateManager {
  constructor() {
    this.state = this.loadState();
    this.subscribers = [];
    this.saveDebouncedFn = this.debounce(() => this.persistState(), 500);
  }

  /**
   * Load state from localStorage or use defaults
   */
  loadState() {
    try {
      const stored = localStorage.getItem("preposState");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all keys exist
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.error("Failed to load state:", error);
    }
    return this.deepClone(DEFAULT_STATE);
  }

  /**
   * Merge user state with defaults to handle version upgrades
   */
  mergeWithDefaults(userState) {
    return {
      targets: { ...DEFAULT_STATE.targets, ...(userState.targets || {}) },
      meals: userState.meals?.length ? userState.meals : this.deepClone(DEFAULT_STATE.meals),
      workoutDays: userState.workoutDays || this.deepClone(DEFAULT_STATE.workoutDays),
      notes: userState.notes || "",
      logs: userState.logs || {}
    };
  }

  /**
   * Persist state to localStorage (debounced)
   */
  save() {
    this.saveDebouncedFn();
  }

  /**
   * Immediately persist state
   */
  persistState() {
    try {
      localStorage.setItem("preposState", JSON.stringify(this.state));
      this.notifySubscribers();
    } catch (error) {
      console.error("Failed to save state:", error);
      this.showToast("Failed to save data", "error");
    }
  }

  /**
   * Get today's date key (YYYY-MM-DD)
   */
  getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Get or initialize today's log entry
   */
  getToday() {
    const key = this.getTodayKey();
    if (!this.state.logs[key]) {
      this.state.logs[key] = {
        meals: {},
        tasks: {},
        water: 0,
        workout: {},
        weight: "",
        sleep: "",
        steps: ""
      };
    }
    return this.state.logs[key];
  }

  /**
   * Update a meal checkbox
   */
  setMealChecked(mealIndex, checked) {
    this.getToday().meals[mealIndex] = checked;
    this.save();
  }

  /**
   * Update a task checkbox
   */
  setTaskChecked(taskKey, checked) {
    this.getToday().tasks[taskKey] = checked;
    this.save();
  }

  /**
   * Save check-in data (weight, sleep, steps)
   */
  saveCheckin(weight, sleep, steps) {
    const today = this.getToday();
    today.weight = this.validateWeight(weight);
    today.sleep = this.validateNumber(sleep, 0, 24);
    today.steps = this.validateNumber(steps, 0);
    today.tasks.checkin = true;
    this.save();
  }

  /**
   * Add water
   */
  addWater(amount) {
    const today = this.getToday();
    today.water = (today.water || 0) + Number(amount);
    this.save();
  }

  /**
   * Reset water
   */
  resetWater() {
    this.getToday().water = 0;
    this.save();
  }

  /**
   * Save workout for a day
   */
  saveWorkout(dayName, exercises) {
    const today = this.getToday();
    today.workout[dayName] = exercises;
    today.tasks.training = true;
    this.save();
  }

  /**
   * Update targets (water, steps, show date)
   */
  updateTargets(water, steps, showDate) {
    this.state.targets = {
      water: this.validateNumber(water, 0, 500) || 128,
      steps: this.validateNumber(steps, 0, 100000) || 10000,
      showDate: this.validateDate(showDate) || this.state.targets.showDate
    };
    this.save();
  }

  /**
   * Update meals
   */
  updateMeals(meals) {
    if (Array.isArray(meals) && meals.length > 0) {
      this.state.meals = meals.map(m => ({
        name: String(m.name || "").trim() || "Unnamed Meal",
        details: String(m.details || "").trim()
      }));
      this.save();
    }
  }

  /**
   * Add a new meal
   */
  addMeal() {
    this.state.meals.push({
      name: `Meal ${this.state.meals.length + 1}`,
      details: ""
    });
    this.save();
  }

  /**
   * Remove a meal
   */
  removeMeal(index) {
    if (index >= 0 && index < this.state.meals.length) {
      this.state.meals.splice(index, 1);
      this.save();
    }
  }

  /**
   * Update notes
   */
  updateNotes(notes) {
    this.state.notes = String(notes || "").trim();
    this.save();
  }

  /**
   * Get weight entries for chart (last 30 entries with weights)
   */
  getWeightHistory(limit = 30) {
    return Object.entries(this.state.logs)
      .filter(([, log]) => Number(log.weight))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-limit);
  }

  /**
   * Get recent check-ins (last 14 entries)
   */
  getRecentCheckins(limit = 14) {
    return Object.entries(this.state.logs)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, limit);
  }

  /**
   * Clear all weight data
   */
  clearWeightData() {
    Object.values(this.state.logs).forEach(log => {
      log.weight = "";
    });
    this.save();
  }

  /**
   * Export state as JSON
   */
  exportState() {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Import state from JSON
   */
  importState(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.state = this.mergeWithDefaults(imported);
      this.persistState();
      return true;
    } catch (error) {
      console.error("Failed to import state:", error);
      this.showToast("Invalid backup file", "error");
      return false;
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all subscribers of state changes
   */
  notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.state));
  }

  /**
   * Show toast notification
   */
  showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
  }

  /* ============ VALIDATION HELPERS ============ */

  /**
   * Validate weight (0-500 lbs)
   */
  validateWeight(value) {
    const num = Number(value);
    if (isNaN(num)) return "";
    return Math.max(0, Math.min(500, num)).toString();
  }

  /**
   * Validate number with min/max
   */
  validateNumber(value, min = 0, max = Infinity) {
    const num = Number(value);
    if (isNaN(num)) return 0;
    return Math.max(min, Math.min(max, num)).toString();
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  validateDate(value) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(value)) return null;
    const date = new Date(value);
    return !isNaN(date.getTime()) ? value : null;
  }

  /**
   * Deep clone object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Debounce function calls
   */
  debounce(fn, ms) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    };
  }
}

// ============ INITIALIZE GLOBAL STATE MANAGER ============
const StateStore = new StateManager();
