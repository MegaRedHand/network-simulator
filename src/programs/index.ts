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
  /**
   * Starts running the program.
   * @param signalStop Function to call when the program should stop
   */
  run(signalStop: () => void): void;

  /**
   * Stops running the program.
   */
  stop(): void;
}

/**
 * Base class for all programs.
 * Provides a basic structure for programs to be run.
 */
abstract class ProgramBase implements Program {
  static readonly PROGRAM_NAME: string;

  protected viewgraph: ViewGraph;
  protected srcId: DeviceId;

  protected signalStop: () => void;

  constructor(viewgraph: ViewGraph, srcId: DeviceId, inputs: string[]) {
    this.viewgraph = viewgraph;
    this.srcId = srcId;

    this._parseInputs(inputs);
  }

  run(signalStop: () => void) {
    if (this.signalStop) {
      console.error(ProgramBase.PROGRAM_NAME + " already running");
      return;
    }
    this.signalStop = signalStop;

    this._run();
  }

  stop(): void {
    // This function could be useful
    console.debug(ProgramBase.PROGRAM_NAME + " stopping");
    this._stop();
  }

  // Functions to be implemented by subclasses

  /**
   * Parses the given inputs and sets any subclass fields.
   * @param inputs program inputs to be parsed
   */
  protected abstract _parseInputs(inputs: string[]): void;

  /**
   * Starts running the program.
   */
  protected abstract _run(): void;

  /**
   * Stops running the program.
   */
  protected abstract _stop(): void;
}

abstract class EchoSender extends ProgramBase {
  protected dstId: DeviceId;

  protected _parseInputs(inputs: string[]): void {
    if (inputs.length !== 1) {
      console.error(
        EchoSender.PROGRAM_NAME +
          " requires 1 input. " +
          inputs.length +
          " were given.",
      );
      return;
    }
    this.dstId = parseInt(inputs[0]);
  }
}

class SingleEcho extends EchoSender {
  static readonly PROGRAM_NAME = "Send ICMP echo";

  protected _run() {
    sendPacket(this.viewgraph, "ICMP", this.srcId, this.dstId);
    this.signalStop();
  }

  protected _stop() {}
}

const DEFAULT_ECHO_DELAY_MS = 250;

class EchoServer extends EchoSender {
  static readonly PROGRAM_NAME = "Echo server";

  progress = 0;

  protected _run() {
    Ticker.shared.add(this.tick, this);
  }

  private tick(ticker: Ticker) {
    const delay = DEFAULT_ECHO_DELAY_MS;
    this.progress += ticker.deltaMS;
    if (this.progress < delay) {
      return;
    }
    sendPacket(this.viewgraph, "ICMP", this.srcId, this.dstId);
    this.progress -= delay;
  }

  protected _stop() {
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
