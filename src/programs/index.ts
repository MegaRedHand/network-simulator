import { Ticker } from "pixi.js";
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

export class SingleEcho implements Program {
  private viewgraph: ViewGraph;
  private srcId: DeviceId;
  private dstId: DeviceId;
  private signalStop: () => void;

  static readonly PROGRAM_NAME = "Send ICMP echo";

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

export class EchoServer implements Program {
  private viewgraph: ViewGraph;
  private srcId: DeviceId;
  private dstId: DeviceId;
  private progress = 0;
  private signalStop: () => void;

  static readonly PROGRAM_NAME = "Echo server";

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

/**
 * This interface matches a class having a constructor with the given signature
 */
interface ProgramConstructor {
  /**
   * Creates a Program from the given inputs
   */
  new (viewgraph: ViewGraph, srcId: DeviceId, inputs: string[]): Program;
}

const programMap = new Map<string, ProgramConstructor>([
  [SingleEcho.PROGRAM_NAME, SingleEcho],
  [EchoServer.PROGRAM_NAME, EchoServer],
]);

/**
 * Creates a new program instance.
 * @param viewgraph Viegraph instance the device is on
 * @param sourceId ID of the device running the program
 * @param runningProgram data of the running program
 * @returns a new Program instance if the data is valid, undefined otherwise
 */
export function newProgram(
  viewgraph: ViewGraph,
  sourceId: DeviceId,
  runningProgram: RunningProgram,
): Program | undefined {
  const { name, inputs } = runningProgram;
  const GivenProgram = programMap.get(name);

  if (!GivenProgram) {
    console.error("Unknown program: ", name);
    return undefined;
  }
  return new GivenProgram(viewgraph, sourceId, inputs);
}
