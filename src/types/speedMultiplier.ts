export class SpeedMultiplier {
  private _value: number;
  private isPaused = false;

  constructor(initialValue = 1) {
    this.setSpeed(initialValue);
  }

  // Get the current speed value
  get value(): number {
    return this.isPaused ? 0 : this._value;
  }

  setSpeed(value: number) {
    if (value <= 0) {
      throw new Error("Speed value must be greater than 0");
    }
    this._value = value;
  }

  pause() {
    this.isPaused = true;
  }

  unpause() {
    this.isPaused = false;
  }
}
