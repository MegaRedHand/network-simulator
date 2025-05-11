import { ProgramInfo } from "../graphics/renderables/device_info";
import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";
import { ProgramBase } from "./program_base";
import { ViewNetworkDevice } from "../types/view-devices/vNetworkDevice";
import { EthernetFrame, FramePayload, MacAddress } from "../packets/ethernet";
import { sendViewPacket } from "../types/packet";
import { IpAddress } from "../packets/ip";
import { ArpRequest } from "../packets/arp";
import { TOOLTIP_KEYS } from "../utils/constants/tooltips_constants";

// ARP Request/Response
export class ArpProtocol extends ProgramBase {
  static readonly PROGRAM_NAME = TOOLTIP_KEYS.SEND_ARP_REQUEST;

  protected dstIp: IpAddress;

  constructor(viewgraph: ViewGraph, srcId: DeviceId, inputs: string[]) {
    super(viewgraph, srcId, inputs);
    this._parseInputs(inputs);
  }

  protected _parseInputs(inputs: string[]): void {
    if (inputs.length !== 1) {
      console.error(
        "ArpRequest requires 1 input. " + inputs.length + " were given.",
      );
      return;
    }
    const input = inputs[0];
    if (typeof input === "string") {
      const dstIp = IpAddress.parse(input);
      if (dstIp) {
        this.dstIp = dstIp;
        return;
      }
    }
    console.error("Invalid input. Expected a string with a IP address format.");
  }

  protected _run() {
    this.sendRequest();
    this.signalStop();
  }

  private sendRequest() {
    const srcDevice = this.viewgraph.getDevice(this.srcId);
    if (!(srcDevice instanceof ViewNetworkDevice)) {
      console.log(
        "At least one device between source and destination is not a network device",
      );
      return;
    }
    const connections = this.viewgraph.getConnections(this.srcId);
    connections.forEach((edge) => {
      const payload: FramePayload = new ArpRequest(
        srcDevice.mac,
        srcDevice.ip,
        this.dstIp,
      );
      const ethernetFrame = new EthernetFrame(
        srcDevice.mac,
        MacAddress.broadcastAddress(),
        payload,
      );
      sendViewPacket(
        this.viewgraph,
        this.srcId,
        ethernetFrame,
        edge.otherEnd(this.srcId),
      );
    });
  }

  protected _stop() {
    // nothing to do
  }

  static getProgramInfo(viewgraph: ViewGraph, srcId: DeviceId): ProgramInfo {
    const programInfo = new ProgramInfo(this.PROGRAM_NAME);
    programInfo.withDestinationIpDropdown(viewgraph, srcId);
    return programInfo;
  }
}
