import { Program } from ".";
import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";

/**
 * Base class for all programs.
 * Provides a basic structure for programs to be run.
 */
export abstract class ProgramBase implements Program {
  protected viewgraph: ViewGraph;
  protected srcId: DeviceId;

  // Asynchronously running program
  private _signalStop?: () => void;

  constructor(viewgraph: ViewGraph, srcId: DeviceId, inputs: string[]) {
    this.viewgraph = viewgraph;
    this.srcId = srcId;

    this._parseInputs(inputs);
  }

  run(): Promise<void> {
    if (this._signalStop) {
      console.error("Program is already running");
      return;
    }

    // NOTE: this is to return a promise
    // We store the resolve function in `ProgramBase._signalStop`.
    // Once `_signalStop` is called, the promise resolves.
    // The caller can attach callbacks to execute once the program stops.
    const stopPromise = new Promise<void>((resolve) => {
      this._signalStop = resolve;
    });
    this._run();
    return stopPromise;
  }

  stop(): void {
    // This function could be useful
    console.debug("Program stopping");
    this._stop();
    // NOTE: we don't call `signalStop` here, since that's the caller's responsibility
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
