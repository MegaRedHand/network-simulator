import { DeviceId } from "../../types/graphs/datagraph";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { Dropdown } from "../basic_components/dropdown";
import { Renderable } from "./base_info";

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
    const dropdown = new Dropdown({
      label: name,
      tooltip: name,
      options: options,
      onchange: (value) => {
        console.log(`Selected value for ${name}:`, value);
      },
    });
    this.inputs.push(dropdown.render());

    // Store the function to get the selected value
    this.inputsValues.push(() => {
      const selectedOption = dropdown.getValue();
      return selectedOption;
    });
  }
  getInputValues() {
    console.log("getInputValues", this.inputsValues);

    return this.inputsValues.map((getValue) => getValue());
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
