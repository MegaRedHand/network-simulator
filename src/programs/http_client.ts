import { ProgramInfo } from "../graphics/renderables/device_info";
import { EthernetFrame } from "../packets/ethernet";
import { IPv4Packet } from "../packets/ip";
import { Flags, TcpSegment } from "../packets/tcp";
import { NetworkDevice } from "../types/devices";
import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";
import { sendRawPacket } from "../types/packet";
import { ProgramBase } from "./program_base";

export class HttpClient extends ProgramBase {
  static readonly PROGRAM_NAME = "Send HTTP request";

  private dstId: DeviceId;

  protected _parseInputs(inputs: string[]): void {
    if (inputs.length !== 1) {
      console.error(
        "HttpClient requires 1 input. " + inputs.length + " were given.",
      );
      return;
    }
    this.dstId = parseInt(inputs[0]);
  }

  protected _run() {
    this.sendHttpRequest();
    this.signalStop();
  }

  protected _stop() {
    // Nothing to do
  }

  private sendHttpRequest() {
    const dstDevice = this.viewgraph.getDevice(this.dstId);
    const srcDevice = this.viewgraph.getDevice(this.srcId);
    if (!dstDevice) {
      console.error("Destination device not found");
      return;
    }
    if (
      !(srcDevice instanceof NetworkDevice) ||
      !(dstDevice instanceof NetworkDevice)
    ) {
      console.log(
        "At least one device between source and destination is not a network device",
      );
      return;
    }
    // Random number between 1024 and 65535
    const srcPort = Math.floor(Math.random() * (65535 - 1024) + 1024);
    const flags = new Flags();
    const content = new Uint8Array(0);
    const payload = new TcpSegment(srcPort, 80, 0, 0, flags, content);
    const ipPacket = new IPv4Packet(srcDevice.ip, dstDevice.ip, payload);
    const path = this.viewgraph.getPathBetween(this.srcId, this.dstId);
    let dstMac = dstDevice.mac;
    if (!path) return;
    for (const id of path.slice(1)) {
      const device = this.viewgraph.getDevice(id);
      // if there’s a router in the middle, first send frame to router mac
      if (device instanceof NetworkDevice) {
        dstMac = device.mac;
        break;
      }
    }
    const ethernetFrame = new EthernetFrame(srcDevice.mac, dstMac, ipPacket);
    sendRawPacket(this.viewgraph, this.srcId, ethernetFrame);
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    programInfo.withDestinationDropdown(viewgraph, srcId);
    return programInfo;
  }
}
