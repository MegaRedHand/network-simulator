import { ViewGraph } from "../graphs/viewgraph";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DataGraph, DeviceId } from "../graphs/datagraph";
import { Layer } from "../layer";
import { isHost } from "../graphs/datagraph";
import { newProgram, Pid, Program, RunningProgram } from "../../programs";
import { Packet } from "../packet";
import { MacAddress } from "../../packets/ethernet";
import { NetworkDevice } from "./networkDevice";

export class Host extends NetworkDevice {
  viewgraph: ViewGraph;

  private runningPrograms = new Map<Pid, Program>();
  private lastProgramId = 0;

  constructor(
    x: number,
    y: number,
    mac: MacAddress,
    datagraph: DataGraph,
    ip: IpAddress,
    mask: IpAddress,
    viewgraph: ViewGraph,
    id?: DeviceId,
  ) {
    super(x, y, mac, datagraph, ip, mask, id);
    this.viewgraph = viewgraph;
    this.loadRunningPrograms();
  }

  receiveDatagram(packet: Packet): Promise<DeviceId | null> {
    const datagram = packet.rawPacket.payload;
    if (!(datagram instanceof IPv4Packet)) {
      return null;
    }
    if (this.ip.equals(datagram.destinationAddress)) {
      this.handlePacket(datagram);
    }
    return null;
  }

  getLayer(): Layer {
    return Layer.App;
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
    this.runningPrograms.forEach((program) => program.stop());
    this.runningPrograms.clear();
  }
}
