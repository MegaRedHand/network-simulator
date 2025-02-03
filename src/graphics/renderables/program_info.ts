import { createDropdown, Renderable } from "../right_bar";

interface HasValue {
  value: string;
}

export class ProgramInfo implements Renderable {
  readonly name: string;
  private inputs: Node[] = [];
  private inputsValues: HasValue[] = [];

  constructor(name: string) {
    this.name = name;
  }

  withDropdown(name: string, options: { value: string; text: string }[]) {
    const dropdown = createDropdown(name, options);
    this.inputs.push(dropdown);
    this.inputsValues.push(dropdown.querySelector("select"));
  }

  getInputValues() {
    return this.inputsValues.map(({ value }) => value);
  }

  toHTML() {
    return this.inputs;
  }
}
