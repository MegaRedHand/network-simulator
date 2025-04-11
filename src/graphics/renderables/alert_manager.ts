let alertTimeout: NodeJS.Timeout | null = null;

export enum AlertType {
  Success = "alert-success",
  Warning = "alert-warning",
  Error = "alert-error",
}

function showAlert(message: string, type: AlertType, duration = 3000): void {
  // Clear any existing alert timeout
  if (alertTimeout) {
    clearTimeout(alertTimeout);
    alertTimeout = null;
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
  alertTimeout = setTimeout(() => {
    hideAlert();
  }, duration);
}

function hideAlert(): void {
  const alertContainer = document.getElementById("global-alert");
  if (alertContainer) {
    alertContainer.classList.remove("show");
    alertContainer.textContent = ""; // Clear the content
  }
}

export function showSuccess(message: string, duration?: number): void {
  showAlert(message, AlertType.Success, duration);
}

export function showError(message: string, duration?: number): void {
  showAlert(message, AlertType.Error, duration);
}

export function showWarning(message: string, duration?: number): void {
  showAlert(message, AlertType.Warning, duration);
}
