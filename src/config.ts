import { GlobalContext } from "./context";
import { updateTooltipsState } from "./graphics/renderables/tooltip_manager";
import { deselectElement } from "./types/viewportManager";
import { Colors } from "./utils/utils";

export class ConfigModal {
  private ctx: GlobalContext;
  private modalOverlay: HTMLDivElement | null;
  private modalContent: HTMLDivElement | null;
  private closeBtn: HTMLSpanElement | null;
  private saveSettingsButton: HTMLButtonElement | null;
  private colorPicker: HTMLInputElement | null;
  private selectedColor: number; // Stores the actual selected color as a number
  private tempColor: number; // Temporary color for selection
  private enableTooltipsSwitch: HTMLInputElement | null;
  private enableTooltips: boolean;
  private tempEnableTooltips: boolean;

  constructor(ctx: GlobalContext) {
    this.ctx = ctx;
    this.modalOverlay = null;
    this.modalContent = null;
    this.closeBtn = null;
    this.saveSettingsButton = null;
    this.colorPicker = null;
    this.selectedColor = Colors.Violet; // Default saved color
    this.tempColor = this.selectedColor; // Temporary color for selection
    this.enableTooltips = true; // Default saved value
    this.tempEnableTooltips = this.enableTooltips; // Temporary value for selection

    this.createModal();
    this.setupEventListeners();
    this.setUpShortCuts();
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

        <div class="modal-body">
          <!-- Bloque de Shortcuts -->
          <div class="shortcuts-container">
            <h3>Keyboard Shortcuts</h3>
            <div class="scrollable-content">
              <ul class="shortcuts-list">
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
            </div>
          </div>

          <!-- Bloque de Settings -->
          <div class="settings-container">
            <h3>General Settings</h3>
            <div class="scrollable-content">
              <ul class="settings-list">
                <li class="setting-item">
                  <label for="colorPicker">Highlighter Color</label>
                  <input type="color" id="colorPicker">
                </li>
                <li class="setting-item">
                  <label for="enableTooltips">Enable Tooltips</label>
                  <label class="switch">
                    <input type="checkbox" id="enableTooltips" class="switch-input" checked>
                    <span class="switch-slider"></span>
                  </label>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Botón Guardar -->
        <button id="saveSettings" class="save-button">Save Settings</button>
      </div>
    </div>
  `;

    // Capture element references
    this.modalOverlay = document.querySelector(
      ".modal-overlay",
    ) as HTMLDivElement;
    this.modalContent = document.querySelector(
      ".modal-content",
    ) as HTMLDivElement;
    this.closeBtn = document.querySelector(".close") as HTMLSpanElement;
    this.saveSettingsButton = document.getElementById(
      "saveSettings",
    ) as HTMLButtonElement;
    this.colorPicker = document.getElementById(
      "colorPicker",
    ) as HTMLInputElement;
    this.enableTooltipsSwitch = document.getElementById(
      "enableTooltips",
    ) as HTMLInputElement;
  }

  private setupEventListeners() {
    if (
      !this.modalOverlay ||
      !this.modalContent ||
      !this.closeBtn ||
      !this.saveSettingsButton ||
      !this.colorPicker ||
      !this.enableTooltipsSwitch
    ) {
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
      if (this.colorPicker) {
        this.tempColor = this.hexToNumber(this.colorPicker.value);
      }
    };

    this.enableTooltipsSwitch.onchange = () => {
      const isEnabled = this.enableTooltipsSwitch?.checked || false;
      this.tempEnableTooltips = isEnabled; // Update the local variable only
      console.log("Tooltips setting changed (not saved yet):", isEnabled);
    };
  }

  private setUpShortCuts() {
    document.addEventListener("keydown", (event) => {
      const activeElement = document.activeElement as HTMLElement;
      if (
        activeElement &&
        (activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement.isContentEditable)
      ) {
        return;
      }
      if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        deselectElement();
        this.open();
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
    });
  }

  public open() {
    if (this.modalOverlay && this.modalContent) {
      // Reset tempColor to the last saved color when opening
      this.tempColor = this.selectedColor;

      // Update color picker to reflect the saved color
      if (this.colorPicker) {
        this.colorPicker.value = this.toHex(this.selectedColor);
      }

      // Update tooltips setting to the saved value
      if (this.enableTooltipsSwitch) {
        this.tempEnableTooltips = this.enableTooltips;
        this.enableTooltipsSwitch.checked = this.tempEnableTooltips; // Reflect the saved value in the UI
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
        if (this.modalOverlay) {
          this.modalOverlay.style.display = "none"; // Hide after animation
        }
      }, 300);
    }

    // Reset tooltips setting to the saved value
    if (this.enableTooltipsSwitch) {
      this.tempEnableTooltips = this.enableTooltips; // Reset temp value
      this.enableTooltipsSwitch.checked = this.enableTooltips; // Reflect saved value in UI
    }
  }

  private saveSettings() {
    // Save the temp color as the actual selected color
    if (this.tempColor != this.selectedColor) {
      this.selectedColor = this.tempColor;
      this.ctx.change_select_color(this.selectedColor);
    }

    // Save the tooltips setting
    if (this.enableTooltipsSwitch) {
      this.enableTooltips = this.tempEnableTooltips; // Save the temporary value
      this.ctx.change_enable_tooltips(this.enableTooltips); // Update the GlobalContext
      updateTooltipsState(); // Update tooltips state in the app
    }

    console.log(
      "Settings saved. Applied color:",
      this.selectedColor,
      "Tooltips enabled:",
      this.enableTooltips,
    );
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
