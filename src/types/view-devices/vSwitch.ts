import { ViewDevice, DeviceType } from "./vDevice";
import { Layer } from "../layer";
import { ViewGraph } from "../graphs/viewgraph";
import SwitchImage from "../../assets/switch.svg";
import { Position } from "../common";
import { DeviceId, NetworkInterfaceData } from "../graphs/datagraph";
import { RightBar } from "../../graphics/right_bar";
import { Texture } from "pixi.js";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { GlobalContext } from "../../context";
import { sendViewPacket } from "../packet";
import { DataSwitch } from "../data-devices";
import { DeviceInfo } from "../../graphics/renderables/device_info";
import { ArpRequest } from "../../packets/arp";

export class ViewSwitch extends ViewDevice {
  static DEVICE_TEXTURE: Texture;

  static getTexture() {
    if (!ViewSwitch.DEVICE_TEXTURE) {
      ViewSwitch.DEVICE_TEXTURE = Texture.from(SwitchImage);
    }
    return ViewSwitch.DEVICE_TEXTURE;
  }

  constructor(
    id: DeviceId,
    viewgraph: ViewGraph,
    ctx: GlobalContext,
    position: Position,
    mac: MacAddress,
    interfaces: NetworkInterfaceData[],
    tag: string,
  ) {
    super(
      id,
      ViewSwitch.getTexture(),
      viewgraph,
      ctx,
      position,
      mac,
      interfaces,
      tag,
    );
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addSwitchingTable(this.viewgraph, this.id);
    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.Link;
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTooltipDetails(_layer: Layer): string {
    return `MAC: ${this.mac.toCompressedString()}`;
  }

  updateSwitchingTable(mac: MacAddress, deviceId: DeviceId): void {
    console.debug(`Adding ${mac.toString()} to the switching table`);
    this.viewgraph.getDataGraph().modifyDevice(this.id, (device) => {
      if (!device) {
        console.error(`Switch with id ${this.id} not found in datagraph`);
        return;
      }
      if (device instanceof DataSwitch) {
        device.updateSwitchingTable(mac, deviceId);
      }
    });
  }

  private forwardFrame(
    frame: EthernetFrame,
    nextHopId: DeviceId, // will be the interface where to send the packet
    senderId: DeviceId, // will be the interface where the packet came from
  ) {
    if (nextHopId === senderId) {
      // Packet would be sent to the interface where it came, discard it
      return;
    }

    // as this is a switch, frame.destination should already be
    // the mac of the next network device to receive the packet
    const newFrame = new EthernetFrame(
      this.mac,
      frame.destination,
      frame.payload, // should be a copy
    );
    sendViewPacket(this.viewgraph, this.id, newFrame, nextHopId);
  }

  // TODO: change all related senderId features to the receiver interface
  receiveFrame(frame: EthernetFrame, senderId: DeviceId): void {
    if (frame.payload instanceof ArpRequest) {
      const { sha, spa, tha, tpa } = frame.payload;
      const connections = this.viewgraph.getConnections(this.id);
      connections.forEach((edge) => {
        const packet = new ArpRequest(sha, spa, tpa, tha);
        const frame = new EthernetFrame(
          this.mac,
          MacAddress.broadcastAddress(),
          packet,
        );
        const nextHopId = edge.otherEnd(this.id);
        if (!nextHopId || nextHopId === senderId) {
          return;
        }
        sendViewPacket(this.viewgraph, this.id, frame, nextHopId);
      });
      return;
    }
    // Update the switching table with the source MAC address
    this.updateSwitchingTable(frame.source, senderId);

    // If the destination MAC address is in the switching table, send the frame
    // to the corresponding device
    // If the destination MAC address is not in the switching table, send the frame
    // to all devices connected to the switch
    const dDevice = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!dDevice || !(dDevice instanceof DataSwitch)) {
      console.warn(`Switch with id ${this.id} not found in datagraph`);
      return;
    }
    const switchingTable = dDevice.switchingTable;
    const nextHops: DeviceId[] = switchingTable.has(
      frame.destination.toString(),
    )
      ? [switchingTable.get(frame.destination.toString())]
      : this.viewgraph
          .getConnections(this.id)
          .map((edge) => edge.otherEnd(this.id));
    nextHops.forEach((nextHopId) => {
      this.forwardFrame(frame, nextHopId, senderId);
    });
  }
}
