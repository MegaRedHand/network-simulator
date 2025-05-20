export abstract class SwitchSetting {
  key: string;
  label: string;
  value: boolean;
  tempValue: boolean;
  input: HTMLInputElement | null = null;

  constructor(key: string, label: string, defaultValue: boolean) {
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

  setValue(value: boolean) {
    this.value = value;
    this.tempValue = value;
    if (this.input) {
      this.input.checked = value;
    }
    this.apply();
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

  toPersistenceValue(): 0 | 1 {
    return this.value ? 1 : 0;
  }

  abstract apply(): void;
}
