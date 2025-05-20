import { Ticker } from "pixi.js";
import { DeviceId } from "../types/graphs/datagraph";
import { sendViewPacket } from "../types/packet";
import { ProgramBase } from "./program_base";
import { ViewGraph } from "../types/graphs/viewgraph";
import { ProgramInfo } from "../graphics/renderables/device_info";
import { EchoRequest } from "../packets/icmp";
import { IPv4Packet } from "../packets/ip";
import { ViewNetworkDevice } from "../types/view-devices/vNetworkDevice";
import { EthernetFrame } from "../packets/ethernet";
import { TOOLTIP_KEYS } from "../utils/constants/tooltips_constants";

export class SingleEcho extends ProgramBase {
  static readonly PROGRAM_NAME = TOOLTIP_KEYS.SEND_ICMP_ECHO;

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
      !(srcDevice instanceof ViewNetworkDevice) ||
      !(dstDevice instanceof ViewNetworkDevice)
    ) {
      console.log(
        "At least one device between source and destination is not a network device",
      );
      return;
    }
    const { src, dst, sendingIface } = ViewNetworkDevice.getForwardingData(
      this.srcId,
      this.dstId,
      this.viewgraph,
    );
    const echoRequest = new EchoRequest(0);
    // Wrap in IP datagram
    const ipPacket = new IPv4Packet(src.ip, dst.ip, echoRequest);

    // Resolve destination MAC address
    let dstMac = srcDevice.resolveAddress(dst.ip);
    if (!dstMac) {
      console.warn(
        `Device ${this.srcId} couldn't resolve MAC address for device with IP ${dst.ip.toString()}. Program cancelled`,
      );
      return;
    }

    // Wrap in Ethernet frame
    const ethernetFrame = new EthernetFrame(src.mac, dst.mac, ipPacket);
    sendViewPacket(this.viewgraph, this.srcId, ethernetFrame, sendingIface);
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    programInfo.withDestinationDropdown(viewgraph, srcId);
    return programInfo;
  }
}

export class EchoServer extends ProgramBase {
  static readonly PROGRAM_NAME = TOOLTIP_KEYS.ECHO_SERVER;

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
    this.progress += ticker.deltaMS * this.viewgraph.getSpeed();

    if (this.progress >= delay) {
      this.echoProgram.run(() => {
        // Do nothing
      });
      this.progress -= delay;
    }
  }

  protected _stop() {
    console.debug("Stopping EchoServer");
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
    programInfo.withDestinationDropdown(viewgraph, srcId);
    programInfo.withDropdown("Time between pings", delayOptions);
    return programInfo;
  }
}
