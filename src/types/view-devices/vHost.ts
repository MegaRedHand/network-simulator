import { DeviceType } from "./vDevice";
import { ViewNetworkDevice } from "./vNetworkDevice";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceId, NetworkInterfaceData } from "../graphs/datagraph";
import { RightBar } from "../../graphics/right_bar";
import { Layer } from "../layer";
import {
  getProgramList,
  newProgram,
  Pid,
  Program,
  RunningProgram,
} from "../../programs";
import { Texture } from "pixi.js";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { GlobalContext } from "../../context";
import { DataHost } from "../data-devices";
import { dropPacket } from "../packet";
import { DeviceInfo } from "../../graphics/renderables/device_info";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";

export class ViewHost extends ViewNetworkDevice {
  static DEVICE_TEXTURE: Texture;

  static getTexture() {
    if (!ViewHost.DEVICE_TEXTURE) {
      ViewHost.DEVICE_TEXTURE = Texture.from(PcImage);
    }
    return ViewHost.DEVICE_TEXTURE;
  }

  private runningPrograms = new Map<Pid, Program>();
  private lastProgramId = 0;

  constructor(
    id: DeviceId,
    viewgraph: ViewGraph,
    ctx: GlobalContext,
    position: Position,
    mac: MacAddress,
    interfaces: NetworkInterfaceData[],
    ip: IpAddress,
    mask: IpAddress,
  ) {
    super(
      id,
      ViewHost.getTexture(),
      viewgraph,
      ctx,
      position,
      mac,
      interfaces,
      ip,
      mask,
    );
    this.loadRunningPrograms();
  }

  receiveDatagram(packet: IPv4Packet): void {
    if (!this.ip.equals(packet.destinationAddress)) {
      const frame = new EthernetFrame(this.mac, this.mac, packet);
      dropPacket(this.viewgraph, this.id, frame);
      return;
    }
    this.handleDatagram(packet);
  }

  showInfo(): void {
    const programList = getProgramList(this.viewgraph, this.id);

    const info = new DeviceInfo(this);
    info.addField(
      TOOLTIP_KEYS.IP_ADDRESS,
      this.ip.octets.join("."),
      TOOLTIP_KEYS.IP_ADDRESS,
    );

    info.addProgramRunner(this, programList);

    info.addARPTable(this.viewgraph, this.id);
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
      if (!(device instanceof DataHost)) {
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
      if (!(device instanceof DataHost)) {
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
    if (!(thisDevice instanceof DataHost)) {
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
