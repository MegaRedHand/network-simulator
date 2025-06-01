import { showError } from "../graphics/renderables/alert_manager";
import { ProgramInfo } from "../graphics/renderables/device_info";
import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";
import { Layer } from "../types/layer";
import { AsyncQueue } from "../types/network-modules/asyncQueue";
import { TcpSocket } from "../types/network-modules/tcpModule";
import { ViewHost } from "../types/view-devices";
import { TOOLTIP_KEYS } from "../utils/constants/tooltips_constants";
import { ProgramBase } from "./program_base";

const RESOURCE_MAP = new Map([
  ["/small", generateResource(1 * 1024)], // 1 KB
  ["/medium", generateResource(256 * 1024)], // 256 KB
  ["/large", generateResource(1 * 1024 * 1024)], // 1 MB
]);

const RESOURCE_MAP_SIZES = new Map([
  ["/small", "1 KB"],
  ["/medium", "256 KB"],
  ["/large", "1 MB"],
]);

function generateResource(size: number): Uint8Array {
  const resource = new Uint8Array(size);
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < size; i++) {
    resource[i] = characters.charCodeAt(
      Math.floor(Math.random() * characters.length),
    );
  }
  return resource;
}

export class HttpClient extends ProgramBase {
  static readonly PROGRAM_NAME = TOOLTIP_KEYS.SEND_HTTP_REQUEST;

  private dstId: DeviceId;
  private resource: string;

  private stopped = false;

  protected _parseInputs(inputs: string[]): void {
    if (inputs.length !== 2) {
      console.error(
        "HttpClient requires 2 input. " + inputs.length + " were given.",
      );
      return;
    }
    this.dstId = parseInt(inputs[0]);
    this.resource = inputs[1];
  }

  protected _run() {
    // This starts the request from the background
    (async () => {
      await this.sendHttpRequest();
      if (!this.stopped) {
        this.signalStop();
      }
    })();
  }

  protected _stop() {
    this.stopped = true;
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

    // Encode HTTP request
    // NOTE: For now, as hosts have just one interface, destination ip is hardcoded
    const httpRequest = getContentRequest(
      this.runner.interfaces[0].ip.toString(),
      this.resource,
    );

    // Write request
    const socket = await this.runner.tcpConnect(this.dstId);
    if (!socket) {
      console.error("HttpClient failed to connect");
      showError("Failed to connect to HTTP server. Make sure the forwarding table is set up correctly.");
      return;
    }
    if (this.stopped) {
      socket.abort();
      return;
    }
    const wrote = await socket.write(httpRequest);
    if (wrote < 0) {
      console.error("HttpClient failed to write to socket");
      return;
    }

    // Close connection
    socket.closeWrite();

    // Read response
    const buffer = new Uint8Array(1024);
    const expectedLength = RESOURCE_MAP.get(this.resource)?.length || 0;
    let totalRead = 0;
    while (totalRead < expectedLength) {
      if (this.stopped) {
        socket.abort();
        return;
      }
      const readLength = await socket.read(buffer);
      if (readLength < 0) {
        console.error("HttpClient failed to read from socket");
        return;
      }
      totalRead += readLength;
    }
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const sizeOptions = [];
    for (const [key, value] of RESOURCE_MAP_SIZES) {
      sizeOptions.push({ value: key, text: value });
    }

    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    programInfo.withDestinationDropdown(viewgraph, srcId, Layer.App);
    programInfo.withDropdown("Size of requested resource", sizeOptions);
    return programInfo;
  }
}

function getContentRequest(host: string, resource: string): Uint8Array {
  const httpRequest =
    "GET " + resource + " HTTP/1.1\r\nHost: " + host + "\r\n\r\n";
  const content = new TextEncoder().encode(httpRequest);
  return content;
}

export class HttpServer extends ProgramBase {
  static readonly PROGRAM_NAME = TOOLTIP_KEYS.SERVE_HTTP_REQUESTS;

  private port: number;

  private stopChannel = new AsyncQueue<"stop">();

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
    this.stopChannel.push("stop");
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

    const stopPromise = this.stopChannel.pop();

    while (true) {
      const socket = await Promise.race([stopPromise, listener.next()]);
      if (socket === "stop") {
        break;
      }

      this.serveClient(socket);
    }
    listener.close();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    return programInfo;
  }

  async serveClient(socket: TcpSocket) {
    const buffer = new Uint8Array(1024).fill(0);
    const readLength = await socket.readAll(buffer);

    const readContents = buffer.slice(0, readLength);
    if (readLength < 0) {
      console.error("HttpServer failed to read from socket");
      return;
    }

    const requestContents = new TextDecoder().decode(readContents);
    const matches = requestContents.match(/GET (.+) HTTP\/1.1/);
    if (!matches || matches.length < 2) {
      console.error("HttpServer failed to parse request");
      return;
    }
    const resourceContents = RESOURCE_MAP.get(matches[1]);
    if (!resourceContents) {
      console.error("HttpServer failed to find requested resource");
      return;
    }

    // Encode dummy HTTP response
    const httpResponse =
      "HTTP/1.1 200 OK\r\nContent-Length: " +
      resourceContents.length +
      "\r\n\r\n";
    const content = new TextEncoder().encode(httpResponse);
    const wrote = await socket.write(content);
    if (wrote <= 0) {
      console.error("HttpServer failed to write to socket");
      return;
    }
    const wrote2 = await socket.write(resourceContents);
    if (wrote2 <= 0) {
      console.error("HttpServer failed to write to socket");
      return;
    }
    // Close connection
    socket.closeWrite();
  }
}
