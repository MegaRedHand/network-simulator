import { Ticker } from "pixi.js";
import { DeviceId } from "../types/graphs/datagraph";
import { sendRawPacket } from "../types/packet";
import { ProgramBase } from "./program_base";
import { ViewGraph } from "../types/graphs/viewgraph";
import { ProgramInfo } from "../graphics/renderables/device_info";
import { EchoRequest } from "../packets/icmp";
import { IPv4Packet } from "../packets/ip";

function adjacentDevices(viewgraph: ViewGraph, srcId: DeviceId) {
  const adjacentDevices = viewgraph
    .getAdjacentDeviceIds(srcId)
    .map((id) => ({ value: id.toString(), text: `Device ${id}` }));

  return adjacentDevices;
}

export abstract class EchoSender extends ProgramBase {
  protected dstId: DeviceId;

  protected _parseInputs(inputs: string[]): void {
    if (inputs.length !== 1) {
      console.error(
        "Program requires 1 input. " + inputs.length + " were given.",
      );
      return;
    }
    this.dstId = parseInt(inputs[0]);
  }

  protected sendSingleEcho() {
    const dstDevice = this.viewgraph.getDevice(this.dstId);
    const srcDevice = this.viewgraph.getDevice(this.srcId);
    if (!dstDevice) {
      console.error("Destination device not found");
      return;
    }
    const echoRequest = new EchoRequest(0);
    const ipPacket = new IPv4Packet(srcDevice.ip, dstDevice.ip, echoRequest);
    sendRawPacket(this.viewgraph, this.srcId, ipPacket);
  }
}

export class SingleEcho extends EchoSender {
  static readonly PROGRAM_NAME = "Send ICMP echo";

  protected _run() {
    this.sendSingleEcho();
    this.signalStop();
  }

  protected _stop() {
    // Nothing to do
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    programInfo.withDropdown("Destination", adjacentDevices(viewgraph, srcId));
    return programInfo;
  }
}

const DEFAULT_ECHO_DELAY_MS = 250;

export class EchoServer extends EchoSender {
  static readonly PROGRAM_NAME = "Echo server";

  progress = 0;

  protected _run() {
    Ticker.shared.add(this.tick, this);
  }

  private tick(ticker: Ticker) {
    const delay = DEFAULT_ECHO_DELAY_MS;
    this.progress += ticker.deltaMS * this.viewgraph.getSpeed();
    if (this.progress < delay) {
      return;
    }
    this.sendSingleEcho();
    this.progress -= delay;
  }

  protected _stop() {
    Ticker.shared.remove(this.tick, this);
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    programInfo.withDropdown("Destination", adjacentDevices(viewgraph, srcId));
    return programInfo;
  }
}
