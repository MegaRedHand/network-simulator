import { Device } from "../../types/devices";
import { DeviceType } from "../../types/devices/device";
import { RoutingTableEntry } from "../../types/graphs/datagraph";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { sendPacket } from "../../types/packet";
import {
  createDropdown,
  createToggleTable,
  createRightBarButton,
} from "../right_bar";
import { StyledInfo } from "./styled_info";

export class DeviceInfo extends StyledInfo {
  readonly device: Device;
  inputFields: Node[] = [];

  constructor(device: Device) {
    super(getTypeName(device) + " Information");
    this.device = device;
    this.addCommonInfoFields();
    this.addCommonButtons();
    this.addSendPacketButton();
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
        () => this.device.delete(),
        "right-bar-delete-button",
      ),
    );
  }

  private addSendPacketButton() {
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
