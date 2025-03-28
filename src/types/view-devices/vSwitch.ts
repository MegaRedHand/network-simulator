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

  receiveFrame(frame: EthernetFrame) {
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
    const path = this.viewgraph.getPathBetween(this.id, dstDevice.id);
    if (path.length < 2) {
      console.error("Destination device is not reachable");
      return;
    }
    const nextHopId = path[1];
    const nextHop = this.viewgraph.getDevice(nextHopId);
    if (!nextHop) {
      console.error("Next hop not found");
      return;
    }
    const newFrame = new EthernetFrame(this.mac, nextHop.mac, datagram);
    sendViewPacket(this.viewgraph, this.id, newFrame);
  }
}
