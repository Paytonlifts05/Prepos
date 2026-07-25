/* ============================================================================
   DATA EXPORT - Import/Export functionality with validation
   ============================================================================ */

// ============ EXPORT BACKUP ============

/**
 * Export current state as a JSON backup file
 */
function exportBackup() {
  try {
    const exportData = StateStore.exportState();
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prepos-backup-${StateStore.getTodayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    StateStore.showToast("Backup exported successfully", "success");
  } catch (error) {
    console.error("Export failed:", error);
    StateStore.showToast("Failed to export backup", "error");
  }
}

/**
 * Setup export button listener
 */
function setupExportButton() {
  const exportBtn = document.getElementById("exportData");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportBackup);
  }
}

// ============ IMPORT BACKUP ============

/**
 * Import backup from JSON file
 */
function importBackup(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const jsonString = event.target.result;
      
      // Validate JSON format
      JSON.parse(jsonString);
      
      // Import state
      if (StateStore.importState(jsonString)) {
        StateStore.showToast("Backup imported successfully", "success");
        // Re-render UI with imported data
        setupWorkoutDays();
        renderAll();
      }
    } catch (error) {
      console.error("Import failed:", error);
      StateStore.showToast("Invalid backup file format", "error");
    }
  };

  reader.onerror = () => {
    StateStore.showToast("Failed to read backup file", "error");
  };

  reader.readAsText(file);
}

/**
 * Setup import file input listener
 */
function setupImportButton() {
  const importInput = document.getElementById("importData");
  if (importInput) {
    importInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      importBackup(file);
      // Reset input so same file can be imported again
      event.target.value = "";
    });
  }
}

// ============ INITIALIZE EXPORT/IMPORT ============

/**
 * Setup all data export/import listeners
 */
function setupDataExport() {
  setupExportButton();
  setupImportButton();
}
