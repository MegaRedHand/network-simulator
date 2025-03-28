import { DeviceId } from "../../types/graphs/datagraph";
import { ViewGraph } from "../../types/graphs/viewgraph";
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

  withDestinationDropdown(viewgraph: ViewGraph, srcId: DeviceId) {
    this.withDropdown("Destination", otherDevices(viewgraph, srcId));
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

function otherDevices(viewgraph: ViewGraph, srcId: DeviceId) {
  return viewgraph
    .getDeviceIds()
    .filter((id) => id !== srcId)
    .map((id) => ({ value: id.toString(), text: `Device ${id}` }));
}
