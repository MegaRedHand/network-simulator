import { DeviceType, NetworkDevice } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { IpAddress } from "../../packets/ip";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { DeviceId } from "../graphs/datagraph";
import { Layer } from "./layer";
import { isHost } from "../graphs/datagraph";
import {
  getProgramList,
  newProgram,
  Pid,
  Program,
  RunningProgram,
} from "../../programs";
import { Packet } from "../packet";
import { Texture } from "pixi.js";
import { MacAddress } from "../../packets/ethernet";

export class Host extends NetworkDevice {
  static DEVICE_TEXTURE: Texture;

  static getTexture() {
    if (!Host.DEVICE_TEXTURE) {
      Host.DEVICE_TEXTURE = Texture.from(PcImage);
    }
    return Host.DEVICE_TEXTURE;
  }

  private runningPrograms = new Map<Pid, Program>();
  private lastProgramId = 0;

  constructor(
    id: DeviceId,
    viewgraph: ViewGraph,
    position: Position,
    mac: MacAddress,
    ip: IpAddress,
    mask: IpAddress,
  ) {
    super(id, Host.getTexture(), viewgraph, position, mac, ip, mask);
    this.loadRunningPrograms();
  }

  showInfo(): void {
    const programList = getProgramList(this.viewgraph, this.id);

    const info = new DeviceInfo(this);
    info.addField("IP Address", this.ip.octets.join("."));
    info.addProgramList(this, programList);
    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.App;
  }

  getType(): DeviceType {
    return DeviceType.Host;
  }

  receivePacket(packet: Packet): DeviceId | null {
    if (this.ip.equals(packet.rawPacket.destinationAddress)) {
      this.handlePacket(packet);
    }
    return null;
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
    const { pid } = runningProgram;

    const program = newProgram(this.viewgraph, this.id, runningProgram);

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
