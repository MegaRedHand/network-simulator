import { ViewDevice, DeviceType } from "./vDevice";
import { Layer } from "../layer";
import { ViewGraph } from "../graphs/viewgraph";
import SwitchImage from "../../assets/switch.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { DeviceId } from "../graphs/datagraph";
import { Texture } from "pixi.js";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { IPv4Packet } from "../../packets/ip";
import { GlobalContext } from "../../context";
import { sendViewPacket } from "../packet";

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
  ) {
    super(id, ViewSwitch.getTexture(), viewgraph, ctx, position, mac);
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addEmptySpace();
    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.Link;
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }

  receiveFrame(frame: EthernetFrame, senderId: DeviceId): void {
    const datagram = frame.payload;
    if (!(datagram instanceof IPv4Packet)) {
      return;
    }
    // TODO: this should add the sender to the switching table,
    //       try to match the packet against it to find a receiver,
    //       and broadcast it if no receiver is found
    const dstDevice = this.viewgraph.getDeviceByIP(datagram.destinationAddress);
    if (!dstDevice) {
      console.error("Destination device not found");
      return;
    }
    const connections = this.viewgraph.getConnections(this.id);
    connections.forEach((connection) => {
      const nextHopId = connection.otherEnd(this.id);
      if (nextHopId === senderId) {
        // Don't send the packet back to the sender
        return;
      }
      const nextHop = this.viewgraph.getDevice(nextHopId);
      if (!nextHop) {
        console.warn(`Next hop with if ${nextHopId} not found`);
        return;
      }
      const dstMac = !(nextHop instanceof ViewSwitch)
        ? nextHop.mac
        : dstDevice.mac;
      const newFrame = new EthernetFrame(this.mac, dstMac, datagram);
      sendViewPacket(this.viewgraph, this.id, newFrame);
    });
  }
}
