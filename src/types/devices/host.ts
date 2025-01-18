import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { IpAddress } from "../../packets/ip";
import {
  createEditableText,
  DeviceInfo,
  RightBar,
} from "../../graphics/right_bar";
import { ProgramInfo } from "../../graphics/renderables/device_info";
import { sendPacket } from "../packet";
import { Ticker } from "pixi.js";

export class Host extends Device {
  currentProgram: () => void = undefined;

  constructor(
    id: number,
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
    const destinationIpContainer = createEditableText("Destination IP");
    const destinationIpInput = destinationIpContainer.querySelector("input");

    const programList: ProgramInfo[] = [
      { name: "No program", start: () => this.stopProgram() },
      {
        name: "Send ICMP echo",
        inputs: [destinationIpContainer],
        start: () => this.sendSingleEcho(destinationIpInput.value),
      },
      {
        name: "Echo server",
        inputs: [destinationIpContainer],
        start: () => this.startEchoServer(destinationIpInput.value),
      },
    ];
    return programList;
  }

  sendSingleEcho(ip: string) {
    this.stopProgram();
    const dstIp = IpAddress.parse(ip);
    if (!dstIp) {
      console.error("Invalid IP address: ", ip);
      return;
    }
    sendPacket(this.viewgraph, "ICMP", this.id, dstIp);
  }

  startEchoServer(ip: string) {
    this.stopProgram();
    const dstIp = IpAddress.parse(ip);
    if (!dstIp) {
      console.error("Invalid IP address: ", ip);
      return;
    }
    const send = () => sendPacket(this.viewgraph, "ICMP", this.id, dstIp);
    Ticker.shared.add(send, this);
    this.currentProgram = send;
  }

  stopProgram() {
    if (this.currentProgram) {
      Ticker.shared.remove(this.currentProgram, this);
    }
  }
}
