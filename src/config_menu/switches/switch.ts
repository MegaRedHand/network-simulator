import { GlobalContext } from "../../context";

export abstract class SwitchSetting {
  key: string;
  label: string;
  value: boolean;
  tempValue: boolean;
  input: HTMLInputElement | null = null;
  ctx: GlobalContext;

  constructor(
    ctx: GlobalContext,
    key: string,
    label: string,
    defaultValue: boolean,
  ) {
    this.ctx = ctx;
    this.key = key;
    this.label = label;
    this.value = defaultValue;
    this.tempValue = defaultValue;
  }

  attachInputListener() {
    if (this.input) {
      this.input.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        this.tempValue = target.checked;
      };
    }
  }

  resetTemp() {
    this.tempValue = this.value;
    if (this.input) {
      this.input.checked = this.tempValue;
    }
  }

  commit() {
    if (this.value !== this.tempValue) {
      this.value = this.tempValue;
      this.apply();
    }
  }

  getHtml(): string {
    return `
      <li class="setting-item">
        <label for="${this.key}">${this.label}</label>
        <label class="switch">
          <input type="checkbox" id="${this.key}" class="switch-input" ${this.value ? "checked" : ""}>
          <span class="switch-slider"></span>
        </label>
      </li>
    `;
  }

  abstract apply(): void;
}
