import { DeviceType } from "./device";
import { NetworkDevice } from "./networkDevice";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { IpAddress, IPv4Packet } from "../../packets/ip";
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
import { Texture } from "pixi.js";
import { MacAddress } from "../../packets/ethernet";
import { GlobalContext } from "../../context";

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
    ctx: GlobalContext,
    position: Position,
    mac: MacAddress,
    ip: IpAddress,
    mask: IpAddress,
  ) {
    super(id, Host.getTexture(), viewgraph, ctx, position, mac, ip, mask);
    this.loadRunningPrograms();
  }

  receiveDatagram(packet: IPv4Packet): Promise<DeviceId | null> {
    if (this.ip.equals(packet.destinationAddress)) {
      this.handlePacket(packet);
    }
    return null;
  }

  showInfo(): void {
    const programList = getProgramList(this.viewgraph, this.id);

    const info = new DeviceInfo(this);
    info.addField("IP Address", this.ip.octets.join("."));
    info.addProgramRunner(this, programList);
    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.App;
  }

  getType(): DeviceType {
    return DeviceType.Host;
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
    return runningProgram;
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
    const program = this.runningPrograms.get(pid);
    if (!program) {
      console.error("Program not found");
      return false;
    }
    program.stop();
    this.runningPrograms.delete(pid);
    return true;
  }

  getRunningPrograms() {
    const thisDevice = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!isHost(thisDevice)) {
      console.error("Node is not a Host");
      return;
    }
    return thisDevice.runningPrograms;
  }

  private loadRunningPrograms() {
    this.getRunningPrograms().forEach((program) => {
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
    super.destroy();
    this.runningPrograms.forEach((program) => program.stop());
    this.runningPrograms.clear();
  }
}
