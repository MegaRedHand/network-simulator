import { Device } from "../../types/devices";
import { DeviceType } from "../../types/devices/device";
import { CreateDevice } from "../../types/devices/utils";
import { RoutingTableEntry } from "../../types/graphs/datagraph";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { sendPacket } from "../../types/packet";
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
          );
          this.device.delete();
          urManager.push(move);
        },
        "right-bar-delete-button",
      ),
    );
  }

  addSendPacketButton() {
    const { id, viewgraph } = this.device;

    const adjacentDevices = viewgraph
      .getDeviceIds()
      .filter((adjId) => adjId !== id)
      .map((id) => ({ value: id.toString(), text: `Device ${id}` }));
    this.inputFields.push(
      // Dropdown for selecting packet type
      createDropdown(
        "Packet Type",
        [
          { value: "IP", text: "IP" },
          { value: "ICMP", text: "ICMP" },
        ],
        "packet-type",
      ),
      // Dropdown for selecting destination
      createDropdown("Destination", adjacentDevices, "destination"),
      // Button to send a packet
      createRightBarButton("Send Packet", () =>
        sendSelectedPacket(viewgraph, id),
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
      createRightBarButton("Start program", () =>
        console.log("Start program: ", selectedProgram.name),
      ),
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

function sendSelectedPacket(viewgraph: ViewGraph, id: number): void {
  // Get the selected packet type and destination ID
  const packetType = (
    document.getElementById("packet-type") as HTMLSelectElement
  )?.value;
  const destinationId = Number(
    (document.getElementById("destination") as HTMLSelectElement)?.value,
  );

  // Call the sendPacket method with the selected values
  if (packetType && !isNaN(destinationId)) {
    sendPacket(viewgraph, packetType, id, destinationId);
  } else {
    console.warn("Please select both a packet type and a destination.");
  }
}
