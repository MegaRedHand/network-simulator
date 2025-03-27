import { createDropdown, Renderable } from "../right_bar";

interface HasValue {
  value: string;
}

export class ProgramInfo implements Renderable {
  readonly name: string;
  private inputs: Node[] = [];
  private inputsValues: (() => string)[] = [];

  constructor(name: string) {
    this.name = name;
  }

  withDropdown(name: string, options: { value: string; text: string }[]) {
    const { container, getValue } = createDropdown(name, options);
    this.inputs.push(container);
    this.inputsValues.push(getValue);
  }
  getInputValues() {
    console.log("getInputValues", this.inputsValues);

    return this.inputsValues.map((getValue) => getValue());
  }

  toHTML() {
    return this.inputs;
  }
}
