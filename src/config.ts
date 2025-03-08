import { GlobalContext } from "./context";

export enum Colors {
  Violet = 0x4b0082,
  Burgundy = 0x6d071a, // Bordo
  Lightblue = 0x1e90ff,
  Green = 0x008000,
  Red = 0xff0000,
  White = 0xffffff,
  Black = 0x000000,
  Yellow = 0xffff00,
}

export class ConfigModal {
  private ctx: GlobalContext;
  private modalOverlay: HTMLDivElement | null;
  private modalContent: HTMLDivElement | null;
  private closeBtn: HTMLSpanElement | null;
  private saveSettingsButton: HTMLButtonElement | null;
  private colorPicker: HTMLInputElement | null;
  private selectedColor: number; // Stores the actual selected color as a number
  private tempColor: number; // Temporary color for selection

  constructor(ctx: GlobalContext) {
    this.ctx = ctx;
    this.modalOverlay = null;
    this.modalContent = null;
    this.closeBtn = null;
    this.saveSettingsButton = null;
    this.colorPicker = null;
    this.selectedColor = Colors.Lightblue; // Default saved color
    this.tempColor = this.selectedColor; // Temporary color for selection

    this.createModal();
    this.setupEventListeners();
  }

  private createModal() {
    const modalContainer = document.getElementById("settingsModal");

    if (!modalContainer) {
      console.error("Modal container not found.");
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
          <div class="settings-container">
            <ul class="settings-list">
              <li class="setting-item">
                <label for="colorPicker">Select Color:</label>
                <input type="color" id="colorPicker" value="${this.toHex(this.selectedColor)}">
              </li>
              <li class="setting-item">
              EJEMPLO DE CONFIG
              </li>
              <li class="setting-item">
              EJEMPLO DE CONFIG
              </li>
              <li class="setting-item">
              EJEMPLO DE CONFIG
              </li>
            </ul>
          </div>

          <!-- Normal Save button outside the scrollable area -->
          <button id="saveSettings" class="save-button">Save Settings</button>

        </div>
      </div>
    `;

    // Capture element references
    this.modalOverlay = document.querySelector(".modal-overlay") as HTMLDivElement;
    this.modalContent = document.querySelector(".modal-content") as HTMLDivElement;
    this.closeBtn = document.querySelector(".close") as HTMLSpanElement;
    this.saveSettingsButton = document.getElementById("saveSettings") as HTMLButtonElement;
    this.colorPicker = document.getElementById("colorPicker") as HTMLInputElement;
  }

  private setupEventListeners() {
    if (!this.modalOverlay || !this.modalContent || !this.closeBtn || !this.saveSettingsButton || !this.colorPicker) {
      console.error("Some modal elements were not found.");
      return;
    }

    // Event to close the modal when clicking the "X" button
    this.closeBtn.onclick = () => this.close();

    // Event to close the modal when clicking outside of it
    this.modalOverlay.onclick = (event) => {
      if (event.target === this.modalOverlay) this.close();
    };

    // Event to save settings and apply selected color
    this.saveSettingsButton.onclick = () => {
      this.saveSettings();
      this.close();
    };

    // Event to update temp color without saving it
    this.colorPicker.oninput = () => {
      this.tempColor = this.hexToNumber(this.colorPicker!.value);
    };
  }

  public open() {
    if (this.modalOverlay && this.modalContent) {
      // Reset tempColor to the last saved color when opening
      this.tempColor = this.selectedColor;

      // Update color picker to reflect the saved color
      if (this.colorPicker) {
        this.colorPicker.value = this.toHex(this.selectedColor);
      }

      this.modalOverlay.style.display = "flex"; // Make it visible first
      setTimeout(() => {
        this.modalOverlay?.classList.add("show");
        this.modalContent?.classList.add("show");
      }, 10); // Small delay for the animation to work properly
    }
  }

  public close() {
    // Reset tempColor and revert picker to saved color
    this.tempColor = this.selectedColor;
    if (this.colorPicker) {
      this.colorPicker.value = this.toHex(this.selectedColor);
    }

    if (this.modalOverlay && this.modalContent) {
      this.modalOverlay.classList.remove("show");
      this.modalContent.classList.remove("show");

      setTimeout(() => {
        this.modalOverlay!.style.display = "none"; // Hide after animation
      }, 300);
    }
  }

  private saveSettings() {
    // Save the temp color as the actual selected color
    if (this.tempColor != this.selectedColor) {
      this.selectedColor = this.tempColor;
      this.ctx.change_select_color(this.selectedColor);;
    }

    console.log("Settings saved. Applied color:", this.selectedColor);
  }

  // Convert a number (0xRRGGBB) to a hex string ("#RRGGBB")
  private toHex(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
  }

  // Convert a hex string ("#RRGGBB") to a number (0xRRGGBB)
  private hexToNumber(hex: string): number {
    return parseInt(hex.replace("#", ""), 16);
  }

  // Method to retrieve the selected color (if needed externally)
  public getSelectedColor(): number {
    return this.selectedColor;
  }
}
