export enum AlertType {
  Success = "alert-success",
  Warning = "alert-warning",
  Error = "alert-error",
}

export class AlertManager {
  private static instance: AlertManager | null = null; // Singleton instance
  private alertTimeout: NodeJS.Timeout | null = null;

  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  /**
   * Displays an alert with the specified message and type.
   * @param message - The message to display in the alert.
   * @param type - The type of alert (e.g., "alert-success", "alert-warning", "alert-error").
   * @param duration - The duration (in milliseconds) for which the alert should be visible.
   */
  public showAlert(message: string, type: string, duration = 3000): void {
    // Clear any existing alert timeout
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
      this.alertTimeout = null;
    }

    // Create the alert container if it doesn't exist
    let alertContainer = document.getElementById("global-alert");
    if (!alertContainer) {
      alertContainer = document.createElement("div");
      alertContainer.id = "global-alert";
      alertContainer.classList.add("alert-container");
      document.body.appendChild(alertContainer);
    }

    // Set the alert content and type
    alertContainer.textContent = message;
    alertContainer.className = `alert-container ${type} show`;

    // Automatically hide the alert after the specified duration
    this.alertTimeout = setTimeout(() => {
      this.hideAlert();
    }, duration);
  }

  /**
   * Hides the currently visible alert.
   */
  public hideAlert(): void {
    const alertContainer = document.getElementById("global-alert");
    if (alertContainer) {
      alertContainer.classList.remove("show");
      alertContainer.textContent = ""; // Clear the content
    }
  }
}
