export class SpeedMultiplier {
  private _value: number;

  constructor(initialValue = 1) {
    this._value = initialValue;
  }

  // Get the current speed value
  get value(): number {
    return this._value;
  }

  // Set a new speed value
  set value(newValue: number) {
    if (newValue > 0) {
      this._value = newValue;
    } else {
      throw new Error("Speed value must be greater than 0");
    }
  }

  // Get the speed multiplier as a formatted string
  get multiplier(): string {
    return `${this._value}x`;
  }

  // Static method to parse a number to a Speed instance
  static parse(value: number): SpeedMultiplier {
    if (value > 0) {
      return new SpeedMultiplier(value);
    } else {
      throw new Error("Speed value must be greater than 0");
    }
  }
}
