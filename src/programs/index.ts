import { ProgramInfo } from "../graphics/renderables/program_info";
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

// List of all programs
const programList = [SingleEcho, EchoServer];

// Map of program name to program constructor
const programMap = new Map<string, ProgramConstructor>(
  programList.map((p) => [p.PROGRAM_NAME, p]),
);

export function getProgramList(
  viewgraph: ViewGraph,
  srcId: DeviceId,
): ProgramInfo[] {
  const adjacentDevices = viewgraph
    .getDeviceIds()
    .filter((adjId) => adjId !== srcId)
    .map((id) => ({ value: id.toString(), text: `Device ${id}` }));

  const programList = [];

  {
    const programInfo = new ProgramInfo(SingleEcho.PROGRAM_NAME);
    programInfo.withDropdown("Destination", adjacentDevices);
    programList.push(programInfo);
  }
  {
    const programInfo = new ProgramInfo(EchoServer.PROGRAM_NAME);
    programInfo.withDropdown("Destination", adjacentDevices);
    programList.push(programInfo);
  }

  return programList;
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
