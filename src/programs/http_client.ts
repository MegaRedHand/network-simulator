import { ProgramInfo } from "../graphics/renderables/device_info";
import { EthernetFrame } from "../packets/ethernet";
import { IPv4Packet } from "../packets/ip";
import { Flags, TcpSegment } from "../packets/tcp";
import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";
import { Layer } from "../types/layer";
import { sendViewPacket } from "../types/packet";
import { ViewHost } from "../types/view-devices";
import { ViewNetworkDevice } from "../types/view-devices/vNetworkDevice";
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
    if (!(srcDevice instanceof ViewHost) || !(dstDevice instanceof ViewHost)) {
      console.log(
        "At least one device between source and destination is not a network device",
      );
      return;
    }

    // Encode dummy HTTP request
    const httpRequest = "GET / HTTP/1.1\r\nHost: " + dstDevice.ip + "\r\n\r\n";
    const content = new TextEncoder().encode(httpRequest);

    // Random number between 1024 and 65535
    const srcPort = Math.floor(Math.random() * (65535 - 1024) + 1024);
    const flags = new Flags();

    // Wrap in TCP segment
    const payload = new TcpSegment(srcPort, 80, 0, 0, flags, content);

    // Wrap in IP packet
    const ipPacket = new IPv4Packet(srcDevice.ip, dstDevice.ip, payload);
    const path = this.viewgraph.getPathBetween(this.srcId, this.dstId);
    let dstMac = dstDevice.mac;
    if (!path) return;
    for (const id of path.slice(1)) {
      const device = this.viewgraph.getDevice(id);
      // if there’s a router in the middle, first send frame to router mac
      if (device instanceof ViewNetworkDevice) {
        dstMac = device.mac;
        break;
      }
    }
    const ethernetFrame = new EthernetFrame(srcDevice.mac, dstMac, ipPacket);
    sendViewPacket(this.viewgraph, this.srcId, ethernetFrame);
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    programInfo.withDestinationDropdown(viewgraph, srcId, Layer.App);
    return programInfo;
  }
}
