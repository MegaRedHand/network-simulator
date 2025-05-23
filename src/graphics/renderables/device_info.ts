import { ProgramRunner } from "../../programs";
import { ViewDevice } from "../../types/view-devices";
import { DeviceType } from "../../types/view-devices/vDevice";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { RemoveDeviceMove } from "../../types/undo-redo";
import { urManager } from "../../types/viewportManager";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { ProgramInfo } from "./program_info";
import { ProgramRunnerInfo } from "./program_runner_info";
import { RoutingTable } from "./routing_table";
import { ToggleParameterEditor } from "../components/toggle_parameter_editor";
import { Button } from "../basic_components/button";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { BaseInfo } from "./base_info";
import { ProgressBar } from "../basic_components/progress_bar";
import { LabeledProgressBar } from "../components/labeled_progress_bar";
import { ArpTable } from "./arp_table";
import { Layer } from "../../types/layer";
import { DataNetworkDevice, DataSwitch } from "../../types/data-devices";
import { SwitchingTable } from "./switching_table";

export class DeviceInfo extends BaseInfo {
  readonly device: ViewDevice;

  constructor(device: ViewDevice) {
    super(getTypeName(device) + " Information");
    this.device = device;
    this.addCommonInfoFields();
  }

  protected addCommonInfoFields(): void {
    const { id } = this.device;
    const connections = this.device.viewgraph.getVisibleConnectedDeviceIds(id);

    this.information.addField(TOOLTIP_KEYS.ID, id.toString(), TOOLTIP_KEYS.ID);
    this.information.addListField(
      TOOLTIP_KEYS.CONNECTED_DEVICES,
      connections,
      TOOLTIP_KEYS.CONNECTED_DEVICES,
    );

    const layer = this.device.viewgraph.getLayer();
    const showIp = this.device.getType() !== DeviceType.Switch;
    const showMac = layer === Layer.Link;

    if (showIp) {
      this.device.interfaces.forEach((iface) => {
        this.information.addField(
          TOOLTIP_KEYS.IP_ADDRESS + (iface.name ? ` (${iface.name})` : ""),
          iface.ip.toString(),
          TOOLTIP_KEYS.IP_ADDRESS,
        );
      });
    }

    if (showMac) {
      this.device.interfaces.forEach((iface) => {
        this.information.addField(
          TOOLTIP_KEYS.MAC_ADDRESS + (iface.name ? ` (${iface.name})` : ""),
          iface.mac.toString(),
          TOOLTIP_KEYS.MAC_ADDRESS,
        );
      });
    }
  }

  protected addCommonButtons(): void {
    this.addDivider();
    const connectButton = new Button({
      text: TOOLTIP_KEYS.CONNECT_DEVICE,
      onClick: () => this.device.selectToConnect(),
      classList: [
        CSS_CLASSES.RIGHT_BAR_BUTTON,
        CSS_CLASSES.RIGHT_BAR_CONNECT_BUTTON,
      ],
      tooltip: TOOLTIP_KEYS.CONNECT_DEVICE,
    });

    const deleteButton = new Button({
      text: TOOLTIP_KEYS.DELETE_DEVICE,
      onClick: () => {
        const currLayer = this.device.viewgraph.getLayer();
        const move = new RemoveDeviceMove(currLayer, this.device.id);
        urManager.push(this.device.viewgraph, move);
      },
      classList: [
        CSS_CLASSES.RIGHT_BAR_BUTTON,
        CSS_CLASSES.RIGHT_BAR_DELETE_BUTTON,
      ],
      tooltip: TOOLTIP_KEYS.DELETE_DEVICE,
    });

    this.inputFields.push(connectButton.toHTML(), deleteButton.toHTML());
    this.addDivider();
  }

  addProgramRunner(runner: ProgramRunner, programs: ProgramInfo[]): void {
    const programRunnerInfo = new ProgramRunnerInfo(runner, programs);
    this.inputFields.push(...programRunnerInfo.toHTML());
  }

  addRoutingTable(viewgraph: ViewGraph, deviceId: number): void {
    const entries = viewgraph.getRoutingTable(deviceId);

    const rows = entries.map((entry) => [
      entry.ip,
      entry.mask,
      `eth${entry.iface}`,
    ]);

    const routingTable = new RoutingTable({
      rows,
      viewgraph,
      deviceId,
    });

    this.inputFields.push(routingTable.toHTML());

    this.addDivider();
  }

  addEmptySpace(): void {
    this.inputFields.push(document.createElement("br"));
  }

  addParameterGroup(
    groupName: string,
    tooltip: string,
    parameters: {
      label: string;
      initialValue: number | string;
      onChange: (newValue: number | string) => void;
    }[],
  ): void {
    const parameterEditor = new ToggleParameterEditor(
      groupName,
      tooltip,
      parameters,
    );
    this.inputFields.push(parameterEditor.toHTML());
    this.addDivider();
  }

  /**
   * Adds a progress bar with a label above it.
   * @param label - The text of the label to be displayed above the progress bar.
   * @param current - The current value of the progress bar.
   * @param max - The maximum value of the progress bar.
   * @param subscribe - A function that subscribes to changes in the progress bar.
   */
  addProgressBar(
    label: string,
    current: number,
    max: number,
    subscribe: (progressBar: ProgressBar) => void,
  ): void {
    const labeledProgressBar = new LabeledProgressBar(
      label,
      current,
      max,
      subscribe,
    );
    this.inputFields.push(labeledProgressBar.toHTML());
  }

  addARPTable(viewgraph: ViewGraph, deviceId: number): void {
    const entries = viewgraph.getArpTable(deviceId);

    const rows = entries.map((entry) => [entry.ip, entry.mac]);

    const arpTable = new ArpTable({
      rows,
      viewgraph,
      deviceId,
    });

    this.inputFields.push(arpTable.toHTML());

    const dataDevice = viewgraph.getDataGraph().getDevice(deviceId);

    if (dataDevice instanceof DataNetworkDevice) {
      // Suscribe to ARP table changes
      dataDevice.setArpTableChangeListener(() => {
        // update the ARP table in the UI
        arpTable.refreshTable();
      });
    } else {
      console.warn(`Device with ID ${deviceId} is not a DataNetworkDevice.`);
    }
  }

  addSwitchingTable(viewgraph: ViewGraph, deviceId: number): void {
    const entries = viewgraph.getDataGraph().getSwitchingTable(deviceId);

    const rows = entries.map((entry) => [entry.mac, entry.port.toString()]);

    const switchingTable = new SwitchingTable({
      rows,
      viewgraph,
      deviceId,
    });

    this.inputFields.push(switchingTable.toHTML());

    const dataDevice = viewgraph.getDataGraph().getDevice(deviceId);

    if (dataDevice instanceof DataSwitch) {
      dataDevice.setSwitchingTableChangeListener(() => {
        switchingTable.refreshTable();
      });
    } else {
      console.warn(`Device with ID ${deviceId} is not a DataNetworkDevice.`);
    }
  }
}

function getTypeName(device: ViewDevice): string {
  switch (device.getType()) {
    case DeviceType.Router:
      return "Router";
    case DeviceType.Host:
      return "Host";
    case DeviceType.Switch:
      return "Switch";
    default:
      return "Unknown Device";
  }
}

export { ProgramInfo };
