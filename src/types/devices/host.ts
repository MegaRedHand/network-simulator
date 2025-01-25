import { Device, DeviceType } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { createDropdown, DeviceInfo, RightBar } from "../../graphics/right_bar";
import { ProgramInfo } from "../../graphics/renderables/device_info";
import { Packet, sendPacket } from "../packet";
import { Ticker } from "pixi.js";
import { DeviceId } from "../graphs/datagraph";
import { Layer } from "./layer";
import { EchoRequest } from "../../packets/icmp";

const DEFAULT_ECHO_DELAY = 250; // ms

export class Host extends Device {
  currentProgram: (ticker: Ticker) => void = undefined;

  constructor(
    id: DeviceId,
    viewgraph: ViewGraph,
    position: Position,
    ip: IpAddress,
    mask: IpAddress,
  ) {
    super(id, PcImage, viewgraph, position, ip, mask);
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addField("IP Address", this.ip.octets.join("."));
    info.addProgramList(this.getProgramList());
    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.App;
  }

  getType(): DeviceType {
    return DeviceType.Host;
  }

  getProgramList() {
    const adjacentDevices = this.viewgraph
      .getDeviceIds()
      .filter((adjId) => adjId !== this.id)
      .map((id) => ({ value: id.toString(), text: `Device ${id}` }));

    const dropdownContainer = createDropdown(
      "Destination",
      adjacentDevices,
      "destination",
    );
    const destination = dropdownContainer.querySelector("select");

    const programList: ProgramInfo[] = [
      { name: "No program", start: () => this.stopProgram() },
      {
        name: "Send ping",
        inputs: [dropdownContainer],
        start: () => this.sendSingleEcho(destination.value),
      },
      {
        name: "Echo server",
        inputs: [dropdownContainer],
        start: () => this.startEchoServer(destination.value),
      },
    ];
    return programList;
  }

  sendSingleEcho(id: string) {
    this.stopProgram();
    const dst = parseInt(id);
    const dstDevice = this.viewgraph.getDevice(dst);
    if (dstDevice) {
      const echoRequest = new EchoRequest(0);
      const ipPacket = new IPv4Packet(this.ip, dstDevice.ip, echoRequest);
      sendPacket(this.viewgraph, ipPacket, "ICMP-0", this.id, dst);
    }
  }

  // TODO: Receive ip address instead of id?
  startEchoServer(id: string) {
    this.stopProgram();
    const dst = parseInt(id);
    const dstDevice = this.viewgraph.getDevice(dst);
    // If ip address received instead of id, device may not exist.
    if (dstDevice) {
      let progress = 0;
      const echoRequest = new EchoRequest(0);
      const ipPacket = new IPv4Packet(this.ip, dstDevice.ip, echoRequest);
      const send = (ticker: Ticker) => {
        const delay = DEFAULT_ECHO_DELAY;
        progress += ticker.deltaMS;
        if (progress < delay) {
          return;
        }
        sendPacket(this.viewgraph, ipPacket, "ICMP-0", this.id, dst);
        progress -= delay;
      };
      Ticker.shared.add(send, this);
      this.currentProgram = send;
    }
  }

  stopProgram() {
    if (this.currentProgram) {
      Ticker.shared.remove(this.currentProgram, this);
    }
  }
}
