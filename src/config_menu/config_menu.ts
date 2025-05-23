import { deselectElement } from "../types/viewportManager";
import { SwitchSetting } from "./switches/switch";
import { createAllSwitches } from "./switches/switch_factory";

export class ConfigMenu {
  private modalOverlay: HTMLDivElement | null;
  private modalContent: HTMLDivElement | null;
  private closeBtn: HTMLSpanElement | null;
  private saveSettingsButton: HTMLButtonElement | null;
  private changeListeners: (() => void)[] = [];

  private switches: SwitchSetting[];

  constructor() {
    this.modalOverlay = null;
    this.modalContent = null;
    this.closeBtn = null;
    this.saveSettingsButton = null;

    this.switches = createAllSwitches();

    this.createModal();
    this.setupEventListeners();
    this.setUpShortCuts();
  }

  public addListener(listener: () => void) {
    this.changeListeners.push(listener);
  }

  private notifyChange() {
    this.changeListeners.forEach((listener) => listener());
  }

  getSwitchesPersistence(): Record<string, 0 | 1> {
    const result: Record<string, 0 | 1> = {};
    this.switches.forEach((sw) => {
      result[sw.key] = sw.toPersistenceValue();
    });
    return result;
  }

  applySwitchesPersistence(state: Record<string, 0 | 1>) {
    this.switches.forEach((sw) => {
      if (sw.key in state) {
        sw.setValue(!!state[sw.key]);
      }
    });
  }

  public getConfigSwitchValue(key: string): boolean | undefined {
    const sw = this.switches.find((sw) => sw.key === key);
    return sw ? sw.value : undefined;
  }

  private createModal() {
    const modalContainer = document.getElementById("settingsModal");
    if (!modalContainer) {
      console.error("Modal container not found.");
      return;
    }

    const switchesHtml = this.switches.map((sw) => sw.getHtml()).join("");

    modalContainer.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Settings & Shortcuts</h2>
        <div class="modal-body">
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
          <div class="settings-container">
            <h3>General Settings</h3>
            <div class="scrollable-content">
              <ul class="settings-list">
                ${switchesHtml}
              </ul>
            </div>
          </div>
        </div>
        <button id="saveSettings" class="save-button">Save Settings</button>
      </div>
    </div>
    `;

    this.switches.forEach((sw) => {
      sw.input = document.getElementById(sw.key) as HTMLInputElement;
    });
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
  }

  private setupEventListeners() {
    if (
      !this.modalOverlay ||
      !this.modalContent ||
      !this.closeBtn ||
      !this.saveSettingsButton
    ) {
      console.error("Some modal elements were not found.");
      return;
    }

    this.closeBtn.onclick = () => this.close();
    this.modalOverlay.onclick = (event) => {
      if (event.target === this.modalOverlay) this.close();
    };
    this.saveSettingsButton.onclick = () => {
      this.saveSettings();
      this.close();
    };

    this.switches.forEach((sw) => {
      sw.attachInputListener();
    });
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
      // Set switches to saved values
      this.switches.forEach((sw) => sw.resetTemp());
      this.modalOverlay.style.display = "flex";
      setTimeout(() => {
        this.modalOverlay?.classList.add("show");
        this.modalContent?.classList.add("show");
      }, 10);
    }
  }

  public close() {
    if (this.modalOverlay && this.modalContent) {
      this.modalOverlay.classList.remove("show");
      this.modalContent.classList.remove("show");
      setTimeout(() => {
        if (this.modalOverlay) {
          this.modalOverlay.style.display = "none";
        }
      }, 300);
    }
    // Reset switches to saved values
    this.switches.forEach((sw) => sw.resetTemp());
  }

  private saveSettings() {
    this.switches.forEach((sw) => sw.commit());
    console.log(
      "Settings saved:",
      this.switches.map((sw) => ({ [sw.key]: sw.value })),
    );

    this.notifyChange();
  }
}
