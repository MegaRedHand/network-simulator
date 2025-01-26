import { ProgramInfo } from "../graphics/renderables/device_info";
import { createDropdown } from "../graphics/right_bar";
import { DeviceId } from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";

export interface RunningProgram {
  name: string;
  inputs: string[];
}

export interface ProgramRunner {
  addRunningProgram(program: RunningProgram): void;
}

// export interface Program {
//   getProgramInfo(): ProgramInfo;
//   getRunningProgram(): RunningProgram;
//   start(): void;
// }

// export class EchoServer implements Program {
//   private viewgraph: ViewGraph;
//   private srcId: DeviceId;

//   constructor(viewgraph: ViewGraph, srcId: DeviceId) {
//     this.viewgraph = viewgraph;
//     this.srcId = srcId;
//   }

//   getProgramInfo(): ProgramInfo {
//     const adjacentDevices = this.viewgraph
//       .getDeviceIds()
//       .filter((adjId) => adjId !== this.srcId)
//       .map((id) => ({ value: id.toString(), text: `Device ${id}` }));

//     const dropdownContainer = createDropdown(
//       "Destination",
//       adjacentDevices,
//       "destination",
//     );
//     const destination = dropdownContainer.querySelector("select");

//     // TODO: extract into classes
//     return {
//       name: "Echo server",
//       inputs: [dropdownContainer],
//       start: () => this.startNewEchoServer(destination.value),
//     };
//   }

//   startNewEchoServer(id: string) {

//   start(): void {
//     console.log("Echo server started");
//   }
// }
