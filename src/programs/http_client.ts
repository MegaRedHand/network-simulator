import { showError } from "../graphics/renderables/alert_manager";
import { ProgramInfo } from "../graphics/renderables/device_info";
import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";
import { Layer } from "../types/layer";
import { TcpSocket } from "../types/network-modules/tcpModule";
import { ViewHost } from "../types/view-devices";
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
    (async () => {
      await this.sendHttpRequest();
      this.signalStop();
    })();
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

    // Write request
    const socket = await this.runner.tcpConnect(this.dstId);
    const wrote = await socket.write(content);
    if (wrote < 0) {
      console.error("HttpClient failed to write to socket");
      return;
    }

    // Close connection
    socket.closeWrite();

    // Read response
    const buffer = new Uint8Array(1024);
    const readLength = await socket.read(buffer);
    if (readLength < 0) {
      console.error("HttpClient failed to read from socket");
      return;
    }
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    programInfo.withDestinationDropdown(viewgraph, srcId, Layer.App);
    return programInfo;
  }
}

export class HttpServer extends ProgramBase {
  static readonly PROGRAM_NAME = "Serve HTTP requests";

  private port: number;

  protected _parseInputs(inputs: string[]): void {
    if (inputs.length !== 0) {
      console.error(
        "HttpServer requires no inputs. " + inputs.length + " were given.",
      );
      return;
    }
    // TODO: let users choose port?
    this.port = 80;
  }

  protected _run() {
    // This starts the request from the background
    (async () => {
      await this.serveHttpRequests();
      this.signalStop();
    })();
  }

  protected _stop() {
    // Nothing to do
    // TODO: stop serving requests
  }

  private async serveHttpRequests() {
    const srcDevice = this.viewgraph.getDevice(this.srcId);
    if (!(srcDevice instanceof ViewHost)) {
      console.error(
        "At least one device between source and destination is not a network device",
      );
      return;
    }

    const listener = await this.runner.tcpListenOn(this.port);
    if (!listener) {
      showError(`Port ${this.port} already in use`);
      return;
    }

    while (true) {
      const socket = await listener.next();

      this.serveClient(socket);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    return programInfo;
  }

  async serveClient(socket: TcpSocket) {
    const buffer = new Uint8Array(1024).fill(0);
    const readLength = await socket.readAll(buffer);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const readContents = buffer.slice(0, readLength);
    if (readLength < 0) {
      console.error("HttpServer failed to read from socket");
      return;
    }

    // TODO: validate request

    // Encode dummy HTTP response
    const httpResponse = "HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n";
    const content = new TextEncoder().encode(httpResponse);
    const wrote = await socket.write(content);
    if (wrote < 0) {
      console.error("HttpServer failed to write to socket");
      return;
    }
    // Close connection
    socket.closeWrite();
  }
}
