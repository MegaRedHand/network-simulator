import { DeviceType } from "./vDevice";
import { ViewNetworkDevice } from "./vNetworkDevice";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { IpAddress, IPv4Packet, TCP_PROTOCOL_NUMBER } from "../../packets/ip";
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
import { EthernetFrame } from "../../packets/ethernet";
import { GlobalContext } from "../../context";
import { DataHost } from "../data-devices";
import { dropPacket } from "../packet";
import { DeviceInfo } from "../../graphics/renderables/device_info";
import { TcpSegment } from "../../packets/tcp";
import {
  TcpListener,
  TcpModule,
  TcpSocket,
} from "../network-modules/tcpModule";

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
    interfaces: NetworkInterfaceData[],
    tag: string,
    mask: IpAddress,
  ) {
    super(
      id,
      ViewHost.getTexture(),
      viewgraph,
      ctx,
      position,
      interfaces,
      tag,
      mask,
    );
  }

  initialize() {
    this.loadRunningPrograms();
  }

  receiveDatagram(packet: IPv4Packet, iface: number): void {
    if (!this.interfaces[iface].ip.equals(packet.destinationAddress)) {
      // dummy mac
      const dummyMac = this.interfaces[0].mac;
      const frame = new EthernetFrame(dummyMac, dummyMac, packet);
      dropPacket(this.viewgraph, this.id, frame);
      return;
    }
    if (packet.payload.protocol() === TCP_PROTOCOL_NUMBER) {
      const segment = packet.payload as TcpSegment;
      this.tcpModule.handleSegment(packet.sourceAddress, segment);
      return;
    }
    this.handleDatagram(packet, iface);
  }

  showInfo(): void {
    const programList = getProgramList(this.viewgraph, this.id);

    const info = new DeviceInfo(this);

    info.addProgramRunner(this, programList);

    info.addDivider();

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

  showHttpServerIcon() {
    this.showDeviceIcon(
      "httpServer",
      "🌐",
      -this.height / 2 - 5,
      "HTTP Server",
    );
  }

  hideHttpServerIcon() {
    this.hideDeviceIcon("httpServer");
  }

  // TCP

  private tcpModule = new TcpModule(this);

  async tcpConnect(dstId: DeviceId): Promise<TcpSocket | null> {
    const dstDevice = this.viewgraph.getDevice(dstId);
    if (!dstDevice) {
      console.error("Destination device not found");
      return null;
    }
    if (!(dstDevice instanceof ViewHost)) {
      console.warn("The destination is not a host");
      return null;
    }
    return await this.tcpModule.connect(dstDevice, 80);
  }

  async tcpListenOn(port: number): Promise<TcpListener | null> {
    return await this.tcpModule.listenOn(port);
  }
}
