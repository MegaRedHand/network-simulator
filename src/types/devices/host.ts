import { Device, DeviceType } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { IpAddress } from "../../packets/ip";
import { createDropdown, DeviceInfo, RightBar } from "../../graphics/right_bar";
import { ProgramInfo } from "../../graphics/renderables/device_info";
import { sendPacket } from "../packet";
import { Ticker } from "pixi.js";
import { Layer } from "./layer";
import { RunningProgram } from "../graphs/datagraph";

const DEFAULT_ECHO_DELAY = 250; // ms

export class Host extends Device {
  currentProgram: (ticker: Ticker) => void = undefined;

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
        name: "Send ICMP echo",
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

  private sendSingleEcho(id: string) {
    this.stopProgram();
    const dst = parseInt(id);
    sendPacket(this.viewgraph, "ICMP", this.id, dst);
  }

  private startEchoServer(id: string) {
    this.stopProgram();
    const dst = parseInt(id);
    let progress = 0;
    const send = (ticker: Ticker) => {
      if (this.viewgraph.isDestroyed()) {
        this.stopProgram();
        return;
      }
      const delay = DEFAULT_ECHO_DELAY;
      progress += ticker.deltaMS;
      if (progress < delay) {
        return;
      }
      sendPacket(this.viewgraph, "ICMP", this.id, dst);
      progress -= delay;
    };
    Ticker.shared.add(send, this);
    this.currentProgram = send;
  }

  private stopProgram() {
    if (this.currentProgram) {
      Ticker.shared.remove(this.currentProgram, this);
    }
  }
}
