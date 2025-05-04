import { Program } from ".";
import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";
import { ViewHost } from "../types/view-devices";

/**
 * Base class for all programs.
 * Provides a basic structure for programs to be run.
 */
export abstract class ProgramBase implements Program {
  protected viewgraph: ViewGraph;
  protected srcId: DeviceId;
  protected runner: ViewHost;

  private _signalStop?: () => void;

  constructor(viewgraph: ViewGraph, srcId: DeviceId, inputs: string[]) {
    this.viewgraph = viewgraph;
    this.srcId = srcId;
    const runner = viewgraph.getDevice(srcId);
    // Sanity checks
    if (!runner) {
      throw new Error(`Device ${srcId} not found in the viewgraph`);
    }
    if (!(runner instanceof ViewHost)) {
      throw new Error(`Device ${srcId} is not a host`);
    }
    this.runner = runner;

    this._parseInputs(inputs);
  }

  run(signalStop: () => void) {
    if (this._signalStop) {
      console.error("Program already running");
      return;
    }
    this._signalStop = signalStop;

    this._run();
  }

  stop(): void {
    // This function could be useful
    console.debug("Program stopping");
    this._stop();
  }

  protected signalStop() {
    this._signalStop?.();
    delete this._signalStop;
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
