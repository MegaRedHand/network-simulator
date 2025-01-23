import { Device } from "../../types/devices";
import { DeviceType } from "../../types/devices/device";
import { CreateDevice } from "../../types/devices/utils";
import { RoutingTableEntry } from "../../types/graphs/datagraph";
import { RemoveDeviceMove } from "../../types/undo-redo";
import { urManager } from "../../types/viewportManager";
import {
  createDropdown,
  createToggleTable,
  createRightBarButton,
} from "../right_bar";
import { StyledInfo } from "./styled_info";

export interface ProgramInfo {
  name: string;
  inputs?: Node[];

  start(): void;
}

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
          const deviceData: CreateDevice = {
            id: this.device.id,
            type: this.device.getType(),
            x: this.device.x,
            y: this.device.y,
            ip: this.device.ip.toString(),
            mask: this.device.ipMask.toString(),
          };
          const move = new RemoveDeviceMove(
            deviceData,
            this.device.getConnections(),
            this.device.viewgraph,
          );
          this.device.delete();
          urManager.push(move);
        },
        "right-bar-delete-button",
      ),
    );
  }

  addProgramList(programs: ProgramInfo[]) {
    const programOptions = programs.map(({ name }, i) => {
      return { value: i.toString(), text: name };
    });
    const inputsContainer = document.createElement("div");
    let selectedProgram = programs[0];
    this.inputFields.push(
      // Dropdown for selecting program
      createDropdown("Program", programOptions, "program-selector", (v) => {
        selectedProgram = programs[parseInt(v)];
        const programInputs = selectedProgram.inputs || [];
        inputsContainer.replaceChildren(...programInputs);
      }),
      inputsContainer,
      // Button to send a packet
      createRightBarButton("Start program", () => {
        console.log("Started program: ", selectedProgram.name);
        selectedProgram.start();
      }),
    );
  }

  addRoutingTable(
    entries: RoutingTableEntry[],
    saveChangeCallback: (
      rowIndex: number,
      colIndex: number,
      newValue: string,
    ) => void,
  ) {
    const rows = entries.map((entry) => [
      entry.ip,
      entry.mask,
      `eth${entry.iface}`,
    ]);

    const dynamicTable = createToggleTable(
      "Routing Table",
      ["IP Address", "Mask", "Interface"],
      rows,
      [0, 1, 2], // editable columns index
      saveChangeCallback,
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
