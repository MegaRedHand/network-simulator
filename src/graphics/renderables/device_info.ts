import { ProgramRunner } from "../../programs";
import { Device } from "../../types/devices";
import { DeviceType } from "../../types/devices/device";
import { RoutingTableEntry } from "../../types/graphs/datagraph";
import { RemoveDeviceMove } from "../../types/undo-redo";
import { urManager } from "../../types/viewportManager";
import {
  createDropdown,
  createToggleTable,
  createRightBarButton,
} from "../right_bar";
import { ProgramInfo } from "./program_info";
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
    const { id, connections } = this.device;
    super.addField("ID", id.toString());
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
          const move = new RemoveDeviceMove(deviceData);
          this.device.delete();
          urManager.push(move);
        },
        "right-bar-delete-button",
      ),
    );
  }

  // First argument is to avoid a circular dependency
  addProgramList(runner: ProgramRunner, programs: ProgramInfo[]) {
    const programOptions = programs.map(({ name }, i) => {
      return { value: i.toString(), text: name };
    });
    const inputsContainer = document.createElement("div");
    let selectedProgram = programs[0];
    this.inputFields.push(
      // Dropdown for selecting program
      createDropdown("Program", programOptions, "program-selector", (v) => {
        selectedProgram = programs[parseInt(v)];
        inputsContainer.replaceChildren(...selectedProgram.toHTML());
      }),
      inputsContainer,
      // Button to send a packet
      createRightBarButton("Start program", () => {
        const { name } = selectedProgram;
        console.log("Started program: ", name);
        const inputs = selectedProgram.getInputValues();
        runner.addRunningProgram({ name, inputs });
      }),
    );
  }

  addRoutingTable(entries: RoutingTableEntry[]) {
    const rows = entries.map((entry) => [
      entry.ip,
      entry.mask,
      `eth${entry.iface}`,
    ]);

    const dynamicTable = createToggleTable(
      "Routing Table", // Title
      ["IP Address", "Mask", "Interface"], // Headers
      rows, // Generated files
      "right-bar-toggle-button", // Button class
      "right-bar-table", // Table class
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
  }
}
