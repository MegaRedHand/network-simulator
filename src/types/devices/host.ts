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
import { isHost, RunningProgram } from "../graphs/datagraph";

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
    info.addProgramList(this.getProgramList());
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

    // TODO: extract into classes
    const programList: ProgramInfo[] = [
      {
        name: "Send ping",
        inputs: [dropdownContainer],
        start: () => this.sendSingleEcho(destination.value),
      },
      {
        name: ECHO_SERVER_NAME,
        inputs: [dropdownContainer],
        start: () => this.startNewEchoServer(destination.value),
      },
    ];
    return programList;
  }

  private addRunningProgram(program: RunningProgram) {
    this.viewgraph.getDataGraph().modifyDevice(this.id, (device) => {
      if (!isHost(device)) {
        console.error("Node is not a Host");
        return;
      }
      device.runningPrograms.push(program);
    });
  }

  private loadRunningPrograms() {
    const device = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!isHost(device)) {
      console.error("Node is not a Host");
      return;
    }
    device.runningPrograms.forEach((program) => {
      if (program.name !== ECHO_SERVER_NAME) {
        console.error("Unknown program: ", program.name);
        return;
      }
      this.startEchoServer(program.inputs[0]);
    });
  }

  private sendSingleEcho(id: string) {
    const dst = parseInt(id);
    const dstDevice = this.viewgraph.getDevice(dst);
    if (dstDevice) {
      const echoRequest = new EchoRequest(0);
      const ipPacket = new IPv4Packet(this.ip, dstDevice.ip, echoRequest);
      sendPacket(
        this.viewgraph,
        ipPacket,
        echoRequest.getPacketType(),
        this.id,
        dst,
      );
    }
  }

  private startNewEchoServer(id: string) {
    this.addRunningProgram({ name: "Echo server", inputs: [id] });
    this.startEchoServer(id);
  }

  // TODO: Receive ip address instead of id?
  private startEchoServer(id: string) {
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
        sendPacket(
          this.viewgraph,
          ipPacket,
          echoRequest.getPacketType(),
          this.id,
          dst,
        );
        progress -= delay;
      };
      this.startProgram(send);
    }
  }

  private startProgram(tick: (ticker: Ticker) => void): Pid {
    const pid = ++this.programId;
    this.runningPrograms.set(pid, tick);
    Ticker.shared.add(tick, this);
    return pid;
  }

  // TODO: this is unused
  stopProgram(pid: Pid) {
    const tick = this.runningPrograms.get(pid);
    if (!tick) {
      console.error("Pid not found: ", pid);
      return;
    }
    Ticker.shared.remove(tick, this);
    this.runningPrograms.delete(pid);
  }

  destroy() {
    this.runningPrograms.forEach((tick) => Ticker.shared.remove(tick, this));
    this.runningPrograms.clear();
  }
}
