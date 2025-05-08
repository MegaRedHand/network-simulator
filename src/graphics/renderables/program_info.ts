import { DeviceId } from "../../types/graphs/datagraph";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { DeviceType } from "../../types/view-devices/vDevice";
import { Layer, layerIncluded } from "../../types/layer";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { Dropdown } from "../basic_components/dropdown";
import { Renderable } from "./base_info";

export class ProgramInfo implements Renderable {
  readonly name: string;
  private inputs: Node[] = [];
  private inputsValues: (() => string)[] = [];

  constructor(name: string) {
    this.name = name;
  }

  withDestinationDropdown(
    viewgraph: ViewGraph,
    srcId: DeviceId,
    layer?: Layer,
  ) {
    let devices = otherDevices(viewgraph, srcId);
    if (layer) {
      devices = devices.filter((device) => {
        const deviceLayer = viewgraph.getDevice(device.id)?.getLayer();
        return layerIncluded(deviceLayer, layer);
      });
    }
    this.withDropdown(TOOLTIP_KEYS.DESTINATION, devices);
  }

  withDestinationIpDropdown(viewgraph: ViewGraph, srcId: DeviceId) {
    this.withDropdown(
      TOOLTIP_KEYS.IP_REQUEST,
      otherDevicesIp(viewgraph, srcId),
    );
  }

  withDropdown(name: string, options: { value: string; text: string }[]) {
    const dropdown = new Dropdown({
      default_text: name,
      tooltip: name,
      options: options,
      onchange: (value) => {
        console.log(`Selected value for ${name}:`, value);
      },
    });
    this.inputs.push(dropdown.toHTML());

    // Store the function to get the selected value
    this.inputsValues.push(() => {
      const selectedOption = dropdown.getValue();
      return selectedOption;
    });
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
    .map((id) => ({ value: id.toString(), text: `Device ${id}`, id }));
}

function otherDevicesIp(viewgraph: ViewGraph, srcId: DeviceId) {
  return viewgraph
    .getDevices()
    .filter(
      (device) =>
        device.visible &&
        device.getType() !== DeviceType.Switch &&
        device.id !== srcId,
    )
    .map((device) => {
      if ("ip" in device) {
        const ipString = device.ip.toString();
        return { value: ipString, text: `${ipString} (Device ${device.id})` };
      }
      // Shouldn’t get here
      return { value: "", text: "" };
    });
}
