import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";
import { EchoServer, SingleEcho } from "./echo_sender";

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
