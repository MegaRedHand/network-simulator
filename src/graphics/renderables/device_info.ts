import { ProgramRunner } from "../../programs";
import { Device } from "../../types/devices";
import { DeviceType } from "../../types/devices/device";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { RemoveDeviceMove } from "../../types/undo-redo";
import { urManager } from "../../types/viewportManager";
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
    const { id, connections, mac } = this.device;
    super.addField("ID", id.toString());
    super.addField("MacAddress", mac.toString());
    super.addListField("Connected Devices", Array.from(connections.values()));
  }

  private addCommonButtons() {
    this.inputFields.push(
      createRightBarButton(
        "Connect device",
        () => this.device.selectToConnect(),
        "right-bar-connect-button",
        true,
      ),
      createRightBarButton(
        "Delete device",
        () => {
          const deviceData = this.device.getCreateDevice();
          const currLayer = this.device.viewgraph.getLayer();
          const move = new RemoveDeviceMove(
            currLayer,
            deviceData,
            this.device.viewgraph,
          );
          this.device.delete();
          urManager.push(move);
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
      "Routing Table",
      ["IP", "Mask", "Interface"],
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
