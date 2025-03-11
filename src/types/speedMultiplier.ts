export class SpeedMultiplier {
  private _value: number;

  constructor(initialValue = 1) {
    if (initialValue <= 0) {
      throw new Error("Speed value must be greater than 0");
    }
    this._value = initialValue;
  }

  // Get the current speed value
  get value(): number {
    return this._value;
  }
}
