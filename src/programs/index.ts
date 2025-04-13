import { ProgramInfo } from "../graphics/renderables/program_info";
import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";
import { DummyLinkProgram } from "./dummy_link_program";
import { EchoServer, SingleEcho } from "./echo_sender";
import { HttpClient } from "./http_client";

export type Pid = number;

export interface RunningProgram {
  pid: Pid;
  name: string;
  inputs: string[];
}

// Currently used only for Host, due to a circular dependency
export interface ProgramRunner {
  /**
   * Adds a new program to run.
   * @param name program name
   * @param inputs program inputs
   * @returns the running program data
   */
  addRunningProgram(name: string, inputs: string[]): RunningProgram;

  /**
   * Lists running programs.
   * @returns the list of running programs
   */
  getRunningPrograms(): RunningProgram[];

  /**
   * Stops a running program.
   * @param pid running program ID
   * @returns `true` if the program exists and was stopped, `false` otherwise
   */
  removeRunningProgram(pid: Pid): boolean;
}

export interface Program {
  /**
   * Starts running the program.
   * Returns a promise that's resolved when the program stops normally.
   */
  run(): Promise<void>;

  /**
   * Preemptively stops the running program.
   * Note that this does not resolve the promise returned by `run()`.
   */
  stop(): void;
}

/**
 * This type matches a class having a constructor with the given signature
 */
type ProgramConstructor = new (
  viewgraph: ViewGraph,
  srcId: DeviceId,
  inputs: string[],
) => Program;

// List of all programs.
// Each one has to:
// - Implement the Program interface
// - Have a static readonly PROGRAM_NAME property
// - Have a constructor with the signature (viewgraph, srcId, inputs)
// - Have a getProgramInfo static method
const programList = [SingleEcho, EchoServer, HttpClient, DummyLinkProgram];

// Map of program name to program constructor
const programMap = new Map<string, ProgramConstructor>(
  programList.map((p) => [p.PROGRAM_NAME, p]),
);

export function getProgramList(
  viewgraph: ViewGraph,
  srcId: DeviceId,
): ProgramInfo[] {
  return programList.map((p) => p.getProgramInfo(viewgraph, srcId));
}

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
