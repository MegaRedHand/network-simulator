import { ProgramInfo } from "../graphics/renderables/device_info";
import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";
import { ProgramBase } from "./program_base";
import { ViewNetworkDevice } from "../types/view-devices/vNetworkDevice";
import { EthernetFrame } from "../packets/ethernet";
import { sendViewPacket } from "../types/packet";
import { EmptyPayload, IPv4Packet } from "../packets/ip";

// Dummy program to test the link layer packets forwarding, like ARP Request/Response
export class DummyLinkProgram extends ProgramBase {
  static readonly PROGRAM_NAME = "Dummy link program";

  protected dstId: DeviceId;

  constructor(viewgraph: ViewGraph, srcId: DeviceId, inputs: string[]) {
    super(viewgraph, srcId, inputs);
    this._parseInputs(inputs);
  }

  protected _parseInputs(inputs: string[]): void {
    if (inputs.length !== 1) {
      console.error(
        "DummyLinkProgram requires 1 input. " + inputs.length + " were given.",
      );
      return;
    }
    this.dstId = parseInt(inputs[0]);
  }

  protected _run() {
    this.sendSinglePacket();
    this.signalStop();
  }

  private sendSinglePacket() {
    const dstDevice = this.viewgraph.getDevice(this.dstId);
    const srcDevice = this.viewgraph.getDevice(this.srcId);
    if (!dstDevice) {
      console.error("Destination device not found");
      return;
    }
    if (
      !(srcDevice instanceof ViewNetworkDevice) ||
      !(dstDevice instanceof ViewNetworkDevice)
    ) {
      console.log(
        "At least one device between source and destination is not a network device",
      );
      return;
    }
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
    const payload = new IPv4Packet(
      srcDevice.ip,
      dstDevice.ip,
      new EmptyPayload(),
    );
    const ethernetFrame = new EthernetFrame(srcDevice.mac, dstMac, payload);
    sendViewPacket(this.viewgraph, this.srcId, ethernetFrame);
  }

  protected _stop() {
    // nothing to do
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    programInfo.withDestinationDropdown(viewgraph, srcId);
    return programInfo;
  }

  static getProgramName(): string {
    return this.PROGRAM_NAME;
  }

  static getProgramDescription(): string {
    return "Sends a dummy packet every X ms";
  }

  static getProgramInputs(): string[] {
    return ["Delay in ms"];
  }

  static getProgramOutputs(): string[] {
    return ["Dummy packet"];
  }
}
