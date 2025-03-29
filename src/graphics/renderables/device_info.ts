import { ProgramRunner } from "../../programs";
import { Device } from "../../types/devices";
import { DeviceType } from "../../types/devices/device";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { RemoveDeviceMove } from "../../types/undo-redo";
import { urManager } from "../../types/viewportManager";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { createRightBarButton, createRoutingTable } from "../right_bar";
import { ProgramInfo } from "./program_info";
import { ProgramRunnerInfo } from "./program_runner_info";
import { StyledInfo } from "./styled_info";

export { ProgramInfo } from "./program_info";

export class DeviceInfo extends StyledInfo {
  readonly device: Device;
  inputFields: Node[] = [];

  constructor(device: Device) {
    super(getTypeName(device) + " Information");
    this.device = device;
    this.addCommonInfoFields();
    this.addCommonButtons();
  }

  private addCommonInfoFields() {
    const { id, mac } = this.device;
    const connections = this.device.viewgraph
      .getConnections(id)
      .map((edge) => edge.otherEnd(id));
    super.addField(TOOLTIP_KEYS.ID, id.toString());
    super.addField(TOOLTIP_KEYS.MAC_ADDRESS, mac.toString());
    super.addListField(TOOLTIP_KEYS.CONNECTED_DEVICES, connections);
  }

  private addCommonButtons() {
    this.inputFields.push(
      createRightBarButton(
        TOOLTIP_KEYS.CONNECT_DEVICE,
        () => this.device.selectToConnect(),
        "right-bar-connect-button",
        true,
      ),
      createRightBarButton(
        TOOLTIP_KEYS.DELETE_DEVICE,
        () => {
          const currLayer = this.device.viewgraph.getLayer();
          const move = new RemoveDeviceMove(currLayer, this.device.id);
          urManager.push(this.device.viewgraph, move);
        },
        "right-bar-delete-button",
      ),
    );
  }

  // First argument is to avoid a circular dependency
  addProgramRunner(runner: ProgramRunner, programs: ProgramInfo[]) {
    const programRunnerInfo = new ProgramRunnerInfo(runner, programs);
    this.inputFields.push(...programRunnerInfo.toHTML());
  }

  addRoutingTable(viewgraph: ViewGraph, deviceId: number) {
    const entries = viewgraph.getRoutingTable(deviceId);

    const rows = entries.map((entry) => [
      entry.ip,
      entry.mask,
      `eth${entry.iface}`,
    ]);

    const dynamicTable = createRoutingTable(
      TOOLTIP_KEYS.ROUTING_TABLE,
      [TOOLTIP_KEYS.IP, TOOLTIP_KEYS.MASK, TOOLTIP_KEYS.INTERFACE],
      rows,
      viewgraph,
      deviceId,
    );

    this.inputFields.push(dynamicTable);
  }

  addEmptySpace() {
    this.inputFields.push(document.createElement("br"));
  }

  toHTML(): Node[] {
    return super.toHTML().concat(this.inputFields);
  }
}

function getTypeName(device: Device): string {
  switch (device.getType()) {
    case DeviceType.Router:
      return "Router";
    case DeviceType.Host:
      return "Host";
    case DeviceType.Switch:
      return "Switch";
  }
}
