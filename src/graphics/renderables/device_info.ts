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
import { Layer } from "../../types/layer";

export class DeviceInfo extends BaseInfo {
  readonly device: ViewDevice;

  constructor(device: ViewDevice) {
    super(getTypeName(device) + " Information");
    this.device = device;
    this.addCommonInfoFields();
  }

  protected addCommonInfoFields(): void {
    const { id, mac } = this.device;
    const connections = this.device.viewgraph
      .getConnections(id)
      .map((edge) => edge.otherEnd(id));

    this.information.addField(TOOLTIP_KEYS.ID, id.toString(), TOOLTIP_KEYS.ID);
    this.information.addListField(
      TOOLTIP_KEYS.CONNECTED_DEVICES,
      connections,
      TOOLTIP_KEYS.CONNECTED_DEVICES,
    );
    
    const layer = this.device.viewgraph.getLayer();

    if (layer == Layer.Link) {
      this.information.addField(
        TOOLTIP_KEYS.MAC_ADDRESS,
        mac.toString(),
        TOOLTIP_KEYS.MAC_ADDRESS,
      );
    }
  }

  protected addCommonButtons(): void {
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
