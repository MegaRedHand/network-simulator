import { Device } from "../../types/devices";
import { DeviceType } from "../../types/devices/device";
import { sendPacket } from "../../types/packet";
import { RightBar } from "../right_bar";
import { StyledInfo } from "./styled_info";

export class DeviceInfo extends StyledInfo {
  readonly device: Device;

  constructor(device: Device) {
    super(getTypeName(device) + " Information");
    this.device = device;
    this.addCommonInfoFields();
  }

  private addCommonInfoFields(): void {
    const { id, connections } = this.device;
    super.addField("ID", id.toString());
    super.addListField("Connected Devices", Array.from(connections.values()));
  }

  addCommonButtons(): void {
    const { id, viewgraph } = this.device;
    const rightbar = RightBar.getInstance();
    rightbar.addButton(
      "Connect device",
      () => this.device.selectToConnect(),
      "right-bar-button right-bar-connect-button",
      true,
    );
    rightbar.addButton(
      "Delete device",
      () => this.device.delete(),
      "right-bar-button right-bar-delete-button",
    );

    // Dropdown for selecting packet type
    rightbar.addDropdown(
      "Packet Type",
      [
        { value: "IP", text: "IP" },
        { value: "ICMP", text: "ICMP" },
      ],
      "packet-type",
    );

    // Dropdown for selecting destination
    const adjacentDevices = viewgraph
      .getDeviceIds()
      .filter((adjId) => adjId !== id)
      .map((id) => ({ value: id.toString(), text: `Device ${id}` }));

    rightbar.addDropdown("Destination", adjacentDevices, "destination");

    // Button to send the packet
    rightbar.addButton("Send Packet", () => {
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
    });
  }

  toHTML(): Node[] {
    return super.toHTML();
  }
}

function getTypeName(device: Device): string {
  switch (device.getType()) {
    case DeviceType.Router:
      return "Router";
    case DeviceType.Server:
      return "Server";
    case DeviceType.Pc:
      return "PC";
  }
}
