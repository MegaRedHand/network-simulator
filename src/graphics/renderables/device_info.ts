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

    this.information.addField(TOOLTIP_KEYS.ID, id.toString());
    this.information.addListField(TOOLTIP_KEYS.CONNECTED_DEVICES, connections);
    this.information.addField(TOOLTIP_KEYS.MAC_ADDRESS, mac.toString());
  }

  protected addCommonButtons(): void {
    // Botón para conectar el dispositivo
    const connectButton = new Button({
      text: TOOLTIP_KEYS.CONNECT_DEVICE,
      onClick: () => this.device.selectToConnect(),
      classList: [
        CSS_CLASSES.RIGHT_BAR_BUTTON,
        CSS_CLASSES.RIGHT_BAR_CONNECT_BUTTON,
      ],
      tooltip: TOOLTIP_KEYS.CONNECT_DEVICE,
    });

    // Botón para eliminar el dispositivo
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

    // Agregar los botones al array de inputFields
    this.inputFields.push(connectButton.render(), deleteButton.render());
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

    this.inputFields.push(routingTable.render());
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
    this.inputFields.push(parameterEditor.render());
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
