import { GlobalContext } from "./context";

export class ConfigModal {
  private ctx: GlobalContext;
  private modalOverlay: HTMLDivElement | null;
  private modalContent: HTMLDivElement | null;
  private closeBtn: HTMLSpanElement | null;
  private saveSettingsButton: HTMLButtonElement | null;

  constructor(ctx: GlobalContext) {
    this.ctx = ctx;
    this.modalOverlay = null;
    this.modalContent = null;
    this.closeBtn = null;
    this.saveSettingsButton = null;

    this.createModal();
    this.setupEventListeners();
  }

  private createModal() {
    const modalContainer = document.getElementById("settingsModal");

    if (!modalContainer) {
      console.error("No se encontró el contenedor del modal.");
      return;
    }

    modalContainer.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Settings & Shortcuts</h2>

          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li><strong>[C]</strong> - Connect devices</li>
            <li><strong>[H]</strong> - Open Help</li>
            <li><strong>[Delete] / [Backspace]</strong> - Delete selected element</li>
            <li><strong>[Space]</strong> - Pause/resume simulation</li>
            <li><strong>[Ctrl + Z]</strong> - Undo</li>
            <li><strong>[Ctrl + Y]</strong> - Redo</li>
            <li><strong>[N]</strong> - Create a new network</li>
            <li><strong>[S]</strong> - Save your network</li>
            <li><strong>[L]</strong> - Load a saved network</li>
            <li><strong>[P]</strong> - Print the current network</li>
          </ul>

          <h3>General Settings</h3>
          <button id="saveSettings">Save Settings</button>
        </div>
      </div>
    `;

    // Capturar referencias de los elementos
    this.modalOverlay = document.querySelector(".modal-overlay") as HTMLDivElement;
    this.modalContent = document.querySelector(".modal-content") as HTMLDivElement;
    this.closeBtn = document.querySelector(".close") as HTMLSpanElement;
    this.saveSettingsButton = document.getElementById("saveSettings") as HTMLButtonElement;
  }

  private setupEventListeners() {
    if (!this.modalOverlay || !this.modalContent || !this.closeBtn || !this.saveSettingsButton) {
      console.error("No se encontraron algunos elementos del modal.");
      return;
    }

    // Evento para cerrar modal al hacer clic en la "X"
    this.closeBtn.onclick = () => this.close();

    // Evento para cerrar modal al hacer clic fuera de él
    this.modalOverlay.onclick = (event) => {
      if (event.target === this.modalOverlay) this.close();
    };

    // Evento para guardar la configuración
    this.saveSettingsButton.onclick = () => {
      this.saveSettings();
    };
  }

  public open() {
    if (this.modalOverlay && this.modalContent) {
      this.modalOverlay.style.display = "flex"; // Primero lo hacemos visible
      setTimeout(() => {
        this.modalOverlay?.classList.add("show");
        this.modalContent?.classList.add("show");
      }, 10); // Pequeño delay para que la animación funcione bien
    }
  }

  public close() {
    if (this.modalOverlay && this.modalContent) {
      this.modalOverlay.classList.remove("show");
      this.modalContent.classList.remove("show");

      setTimeout(() => {
        this.modalOverlay!.style.display = "none"; // Ocultar después de la animación
      }, 300);
    }
  }

  private saveSettings() {
    // Guardar configuración en el GlobalContext
    console.log("Configuración guardada en el GlobalContext:", this.ctx);
  }
}
