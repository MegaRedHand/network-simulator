import { Ticker } from "pixi.js";
import { DeviceId } from "../types/graphs/datagraph";
import { sendRawPacket } from "../types/packet";
import { ProgramBase } from "./program_base";
import { ViewGraph } from "../types/graphs/viewgraph";
import { ProgramInfo } from "../graphics/renderables/device_info";
import { EchoRequest } from "../packets/icmp";
import { IPv4Packet } from "../packets/ip";
import { NetworkDevice } from "../types/devices";
import { EthernetFrame } from "../packets/ethernet";

function adjacentDevices(viewgraph: ViewGraph, srcId: DeviceId) {
  const adjacentDevices = viewgraph
    .getAdjacentDeviceIds(srcId)
    .map((id) => ({ value: id.toString(), text: `Device ${id}` }));

  return adjacentDevices;
}

export class SingleEcho extends ProgramBase {
  static readonly PROGRAM_NAME = "Send ICMP echo";

  protected dstId: DeviceId;

  protected _parseInputs(inputs: string[]): void {
    if (inputs.length !== 1) {
      console.error(
        "SingleEcho requires 1 input. " + inputs.length + " were given.",
      );
      return;
    }
    this.dstId = parseInt(inputs[0]);
  }

  protected _run() {
    this.sendSingleEcho();
    this.signalStop();
  }

  protected _stop() {
    // Nothing to do
  }

  private sendSingleEcho() {
    const dstDevice = this.viewgraph.getDevice(this.dstId);
    const srcDevice = this.viewgraph.getDevice(this.srcId);
    if (!dstDevice) {
      console.error("Destination device not found");
      return;
    }
    if (
      !(
        srcDevice instanceof NetworkDevice && dstDevice instanceof NetworkDevice
      )
    ) {
      console.log(
        "At least one device between source and destination is not a network device",
      );
      return;
    }
    const echoRequest = new EchoRequest(0);
    const ipPacket = new IPv4Packet(srcDevice.ip, dstDevice.ip, echoRequest);
    const path = this.viewgraph.getPathBetween(this.srcId, this.dstId);
    let dstMac = dstDevice.mac;
    if (!path) return;
    console.log(path);
    for (const id of path.slice(1)) {
      const device = this.viewgraph.getDevice(id);
      // if there’s a router in the middle, first send frame to router mac
      if (device instanceof NetworkDevice) {
        dstMac = device.mac;
        break;
      }
    }
    const ethernetFrame = new EthernetFrame(srcDevice.mac, dstMac, ipPacket);
    sendRawPacket(this.viewgraph, this.srcId, this.dstId, ethernetFrame);
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    programInfo.withDropdown("Destination", adjacentDevices(viewgraph, srcId));
    return programInfo;
  }
}

export class EchoServer extends ProgramBase {
  static readonly PROGRAM_NAME = "Echo server";

  private echoProgram: SingleEcho;
  private progress = 0;

  private delay: number;

  protected _parseInputs(inputs: string[]): void {
    if (inputs.length !== 2) {
      console.error(
        "EchoServer requires 2 inputs. " + inputs.length + " were given.",
      );
      return;
    }
    this.echoProgram = new SingleEcho(this.viewgraph, this.srcId, [inputs[0]]);
    this.delay = parseInt(inputs[1]);
  }

  protected _run() {
    Ticker.shared.add(this.tick, this);
  }

  private tick(ticker: Ticker) {
    const delay = this.delay;
    this.progress += ticker.deltaMS * this.viewgraph.getSpeed();
    if (this.progress < delay) {
      return;
    }
    this.echoProgram.run(() => {
      // do nothing
    });
    this.progress -= delay;
  }

  protected _stop() {
    Ticker.shared.remove(this.tick, this);
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    // TODO: make this a slider or text field
    const delayOptions = [
      { value: "250", text: "250ms" },
      { value: "500", text: "500ms" },
      { value: "1000", text: "1s" },
      { value: "5000", text: "5s" },
      { value: "15000", text: "15s" },
    ];

    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    programInfo.withDropdown("Destination", adjacentDevices(viewgraph, srcId));
    programInfo.withDropdown("Time between pings", delayOptions);
    return programInfo;
  }
}
