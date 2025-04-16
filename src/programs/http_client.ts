import { ProgramInfo } from "../graphics/renderables/device_info";
import { EthernetFrame } from "../packets/ethernet";
import { IPv4Packet } from "../packets/ip";
import { Flags, TcpSegment } from "../packets/tcp";
import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";
import { Layer } from "../types/layer";
import { TcpSocket } from "../types/network-modules/tcpModule";
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
    // This starts the request from the background
    this.sendHttpRequest();
    this.signalStop();
  }

  protected _stop() {
    // TODO: stop request preemptively?
    // Nothing to do
  }

  private async sendHttpRequest() {
    const dstDevice = this.viewgraph.getDevice(this.dstId);
    const srcDevice = this.viewgraph.getDevice(this.srcId);
    if (!dstDevice) {
      console.error("Destination device not found");
      return;
    }
    if (!(srcDevice instanceof ViewHost) || !(dstDevice instanceof ViewHost)) {
      console.error(
        "At least one device between source and destination is not a network device",
      );
      return;
    }

    // Encode dummy HTTP request
    const httpRequest = "GET / HTTP/1.1\r\nHost: " + dstDevice.ip + "\r\n\r\n";
    const content = new TextEncoder().encode(httpRequest);

    // WIP
    const socket = await this.runner.tcpConnect(this.dstId);
    await socket.write(content);

    const buffer = new Uint8Array(1024);
    await socket.read(buffer);
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    programInfo.withDestinationDropdown(viewgraph, srcId, Layer.App);
    return programInfo;
  }
}

export class HttpServer extends ProgramBase {
  static readonly PROGRAM_NAME = "Serve HTTP requests";

  protected _parseInputs(inputs: string[]): void {
    // if (inputs.length !== 1) {
    //   console.error(
    //     "HttpServer requires 1 input. " + inputs.length + " were given.",
    //   );
    //   return;
    // }
    // this.dstId = parseInt(inputs[0]);
  }

  protected _run() {
    // This starts the request from the background
    this.serveHttpRequests();
    this.signalStop();
  }

  protected _stop() {
    // TODO: stop request preemptively?
    // Nothing to do
  }

  private async serveHttpRequests() {
    const srcDevice = this.viewgraph.getDevice(this.srcId);
    if (!(srcDevice instanceof ViewHost)) {
      console.error(
        "At least one device between source and destination is not a network device",
      );
      return;
    }

    // WIP
    const listener = await this.runner.tcpListenOn(80);

    while (true) {
      const socket = await listener.next();

      this.serveClient(socket);
    }
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    // programInfo.withDestinationDropdown(viewgraph, srcId, Layer.App);
    return programInfo;
  }

  async serveClient(socket: TcpSocket) {
    const buffer = new Uint8Array(1024).fill(0);
    await socket.read(buffer);

    // Encode dummy HTTP request
    // TODO
    const httpResponse = "GET / HTTP/1.1\r\nHost: \r\n\r\n";
    const content = new TextEncoder().encode(httpResponse);
    await socket.write(content);
  }
}
