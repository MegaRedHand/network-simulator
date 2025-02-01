import { Ticker } from "pixi.js";
import { ProgramInfo } from "../graphics/renderables/device_info";
import { createDropdown } from "../graphics/right_bar";
import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";
import { sendPacket } from "../types/packet";

export type Pid = number;

export interface RunningProgram {
  pid: Pid;
  name: string;
  inputs: string[];
}

// Currently used only for Host, due to a circular dependency
export interface ProgramRunner {
  addRunningProgram(name: string, inputs: string[]): void;
}

export interface Program {
  run(signalStop: () => void): void;
  stop(): void;
}

export class SingleEcho {
  private viewgraph: ViewGraph;
  private srcId: DeviceId;
  private dstId: DeviceId;
  private signalStop: () => void;

  constructor(viewgraph: ViewGraph, srcId: DeviceId, inputs: string[]) {
    this.viewgraph = viewgraph;
    this.srcId = srcId;

    this.dstId = parseInt(inputs[0]);
  }

  run(signalStop: () => void) {
    if (this.signalStop) {
      console.error("SingleEcho already running");
      return;
    }
    this.signalStop = signalStop;
    sendPacket(this.viewgraph, "ICMP", this.srcId, this.dstId);
    this.signalStop();
  }

  stop() {}
}

const DEFAULT_ECHO_DELAY = 250; // ms

export class EchoServer {
  private viewgraph: ViewGraph;
  private srcId: DeviceId;
  private dstId: DeviceId;
  private progress = 0;
  private signalStop: () => void;

  constructor(viewgraph: ViewGraph, srcId: DeviceId, inputs: string[]) {
    this.viewgraph = viewgraph;
    this.srcId = srcId;

    this.dstId = parseInt(inputs[0]);
  }

  private tick(ticker: Ticker) {
    const delay = DEFAULT_ECHO_DELAY;
    this.progress += ticker.deltaMS;
    if (this.progress < delay) {
      return;
    }
    sendPacket(this.viewgraph, "ICMP", this.srcId, this.dstId);
    this.progress -= delay;
  }

  run(signalStop: () => void) {
    if (this.signalStop) {
      console.error("SingleEcho already running");
      return;
    }
    this.signalStop = signalStop;
    Ticker.shared.add(this.tick, this);
  }

  stop() {
    Ticker.shared.remove(this.tick, this);
  }
}
