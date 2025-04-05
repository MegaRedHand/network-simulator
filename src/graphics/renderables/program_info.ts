import { DeviceId } from "../../types/graphs/datagraph";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { createDropdown, Renderable } from "../right_bar";

export class ProgramInfo implements Renderable {
  readonly name: string;
  private inputs: Node[] = [];
  private inputsValues: (() => string)[] = [];

  constructor(name: string) {
    this.name = name;
  }

  withDestinationDropdown(viewgraph: ViewGraph, srcId: DeviceId) {
    this.withDropdown("Destination", otherDevices(viewgraph, srcId));
  }

  withDropdown(name: string, options: { value: string; text: string }[]) {
    const { container, getValue } = createDropdown(name, options);
    this.inputs.push(container);
    this.inputsValues.push(getValue);
  }

  getInputValues() {
    return this.inputsValues.map((getValue) => getValue());
  }

  toHTML() {
    return this.inputs;
  }
}

function otherDevices(viewgraph: ViewGraph, srcId: DeviceId) {
  return viewgraph
    .getLayerDeviceIds()
    .filter((id) => id !== srcId)
    .map((id) => ({ value: id.toString(), text: `Device ${id}` }));
}
