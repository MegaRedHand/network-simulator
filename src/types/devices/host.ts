import { Device, DeviceType } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { IpAddress } from "../../packets/ip";
import { createDropdown, DeviceInfo, RightBar } from "../../graphics/right_bar";
import { ProgramInfo } from "../../graphics/renderables/device_info";
import { sendPacket } from "../packet";
import { Ticker } from "pixi.js";
import { DeviceId } from "../graphs/datagraph";
import { Layer } from "./layer";
import { isHost } from "../graphs/datagraph";
import { RunningProgram } from "../../programs";

const DEFAULT_ECHO_DELAY = 250; // ms

const ECHO_SERVER_NAME = "Echo server";

type ProgramTicker = (ticker: Ticker) => void;
type Pid = number;

export class Host extends Device {
  private runningPrograms = new Map<Pid, ProgramTicker>();
  private programId = 0;

  constructor(
    id: DeviceId,
    viewgraph: ViewGraph,
    position: Position,
    ip: IpAddress,
    mask: IpAddress,
  ) {
    super(id, PcImage, viewgraph, position, ip, mask);
    this.loadRunningPrograms();
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addField("IP Address", this.ip.octets.join("."));
    info.addProgramList(this, this.getProgramList());
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

    const programList = [];

    {
      const programInfo = new ProgramInfo("Send ICMP echo");
      programInfo.withDropdown("Destination", adjacentDevices);
      programList.push(programInfo);
    }
    {
      const programInfo = new ProgramInfo(ECHO_SERVER_NAME);
      programInfo.withDropdown("Destination", adjacentDevices);
      programList.push(programInfo);
    }

    return programList;
  }

  addRunningProgram(program: RunningProgram) {
    this.viewgraph.getDataGraph().modifyDevice(this.id, (device) => {
      if (!isHost(device)) {
        console.error("Node is not a Host");
        return;
      }
      device.runningPrograms.push(program);
    });
    this.runProgram(program);
  }

  private loadRunningPrograms() {
    const device = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!isHost(device)) {
      console.error("Node is not a Host");
      return;
    }
    device.runningPrograms.forEach((program) => this.runProgram(program));
  }

  runProgram(program: RunningProgram) {
    if (program.name !== ECHO_SERVER_NAME) {
      console.error("Unknown program: ", program.name);
      return;
    }
    this.startEchoServer(program.inputs[0]);
  }

  private sendSingleEcho(id: string) {
    const dst = parseInt(id);
    sendPacket(this.viewgraph, "ICMP", this.id, dst);
  }

  private startNewEchoServer(id: string) {
    this.addRunningProgram({ name: "Echo server", inputs: [id] });
    this.startEchoServer(id);
  }

  private startEchoServer(id: string) {
    const dst = parseInt(id);
    let progress = 0;
    const send = (ticker: Ticker) => {
      const delay = DEFAULT_ECHO_DELAY;
      progress += ticker.deltaMS;
      if (progress < delay) {
        return;
      }
      sendPacket(this.viewgraph, "ICMP", this.id, dst);
      progress -= delay;
    };
    this.startProgram(send);
  }

  private startProgram(tick: (ticker: Ticker) => void): Pid {
    const pid = ++this.programId;
    this.runningPrograms.set(pid, tick);
    Ticker.shared.add(tick, this);
    return pid;
  }

  destroy() {
    this.runningPrograms.forEach((tick) => Ticker.shared.remove(tick, this));
    this.runningPrograms.clear();
  }
}
