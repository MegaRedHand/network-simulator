import { Device, DeviceType } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { IpAddress } from "../../packets/ip";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { ProgramInfo } from "../../graphics/renderables/device_info";
import { sendPacket } from "../packet";
import { Ticker } from "pixi.js";
import { DeviceId } from "../graphs/datagraph";
import { Layer } from "./layer";
import { isHost } from "../graphs/datagraph";
import {
  EchoServer,
  Pid,
  Program,
  RunningProgram,
  SingleEcho,
} from "../../programs";

const ECHO_SERVER_NAME = "Echo server";

export class Host extends Device {
  private runningPrograms = new Map<Pid, Program>();
  private lastProgramId = 0;

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

  addRunningProgram(name: string, inputs: string[]) {
    const pid = this.getNextPid();
    const runningProgram = { pid, name, inputs };
    this.viewgraph.getDataGraph().modifyDevice(this.id, (device) => {
      if (!isHost(device)) {
        console.error("Node is not a Host");
        return;
      }
      device.runningPrograms.push(runningProgram);
    });
    this.runProgram(runningProgram);
  }

  removeRunningProgram(pid: Pid) {
    this.viewgraph.getDataGraph().modifyDevice(this.id, (device) => {
      if (!isHost(device)) {
        console.error("Node is not a Host");
        return;
      }
      device.runningPrograms = device.runningPrograms.filter(
        (p) => p.pid !== pid,
      );
    });
    this.runningPrograms.delete(pid);
  }

  private loadRunningPrograms() {
    const device = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!isHost(device)) {
      console.error("Node is not a Host");
      return;
    }
    device.runningPrograms.forEach((program) => {
      this.runProgram(program);
      if (program.pid > this.lastProgramId) {
        this.lastProgramId = program.pid;
      }
    });
  }

  private runProgram(runningProgram: RunningProgram) {
    const viewgraph = this.viewgraph;
    const id = this.id;
    const { pid, name, inputs } = runningProgram;

    console.log("Running new program: ", runningProgram);
    let program: Program;
    switch (name) {
      case "Send ICMP echo":
        program = new SingleEcho(viewgraph, id, inputs);
        break;
      case ECHO_SERVER_NAME:
        program = new EchoServer(viewgraph, id, inputs);
        break;
      default:
        console.error("Unknown program: ", name);
        return;
    }
    this.runningPrograms.set(pid, program);
    program.run(() => this.removeRunningProgram(pid));
  }

  private getNextPid(): Pid {
    return ++this.lastProgramId;
  }

  destroy() {
    this.runningPrograms.forEach((program) => program.stop());
    this.runningPrograms.clear();
  }
}
