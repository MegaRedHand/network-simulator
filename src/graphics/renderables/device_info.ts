import { ProgramRunner, RunningProgram } from "../../programs";
import { Device } from "../../types/devices";
import { DeviceType } from "../../types/devices/device";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { RemoveDeviceMove } from "../../types/undo-redo";
import { refreshElement, urManager } from "../../types/viewportManager";
import {
  createDropdown,
  createRightBarButton,
  createTable,
  createRoutingTable,
} from "../right_bar";
import { ProgramInfo } from "./program_info";
import { StyledInfo } from "./styled_info";

export { ProgramInfo } from "./program_info";

export class DeviceInfo extends StyledInfo {
  readonly device: Device;
  inputFields: Node[] = [];

  constructor(device: Device) {
    super(getTypeName(device) + " Information");
    this.device = device;
    this.addCommonInfoFields();
    this.addCommonButtons();
  }

  private addCommonInfoFields() {
    const { id, connections } = this.device;
    super.addField("ID", id.toString());
    super.addListField("Connected Devices", Array.from(connections.values()));
  }

  private addCommonButtons() {
    this.inputFields.push(
      createRightBarButton(
        "Connect device",
        () => this.device.selectToConnect(),
        "right-bar-connect-button",
        true,
      ),
      createRightBarButton(
        "Delete device",
        () => {
          const deviceData = this.device.getCreateDevice();
          const currLayer = this.device.viewgraph.getLayer();
          const move = new RemoveDeviceMove(
            currLayer,
            deviceData,
            this.device.viewgraph,
          );
          this.device.delete();
          urManager.push(move);
        },
        "right-bar-delete-button",
      ),
    );
  }

  // First argument is to avoid a circular dependency
  addProgramRunner(runner: ProgramRunner, programs: ProgramInfo[]) {
    const programOptions = programs.map(({ name }, i) => {
      return { value: i.toString(), text: name };
    });
    const inputsContainer = document.createElement("div");
    let selectedProgram = programs[0];
    inputsContainer.replaceChildren(...selectedProgram.toHTML());
    this.inputFields.push(
      // Dropdown for selecting program
      createDropdown("Program", programOptions, "program-selector", (v) => {
        selectedProgram = programs[parseInt(v)];
        inputsContainer.replaceChildren(...selectedProgram.toHTML());
      }),
      inputsContainer,
      // Button to send a packet
      createRightBarButton("Start program", () => {
        const { name } = selectedProgram;
        console.log("Started program: ", name);
        const inputs = selectedProgram.getInputValues();
        runner.addRunningProgram(name, inputs);
        refreshElement();
      }),
    );
  }

  addRunningProgramsList(
    runner: ProgramRunner,
    runningPrograms: RunningProgram[],
  ) {
    if (runningPrograms.length === 0) {
      return;
    }
    const table = createProgramsTable(runner, runningPrograms);
    this.inputFields.push(table);
  }

  addRoutingTable(viewgraph: ViewGraph, deviceId: number) {
    const entries = viewgraph.getRoutingTable(deviceId);

    const rows = entries.map((entry) => [
      entry.ip,
      entry.mask,
      `eth${entry.iface}`,
    ]);

    const dynamicTable = createRoutingTable(
      "Routing Table",
      ["IP", "Mask", "Interface"],
      rows,
      viewgraph,
      deviceId,
    );

    this.inputFields.push(dynamicTable);
  }

  addEmptySpace() {
    this.inputFields.push(document.createElement("br"));
  }

  toHTML(): Node[] {
    return super.toHTML().concat(this.inputFields);
  }
}

function getTypeName(device: Device): string {
  switch (device.getType()) {
    case DeviceType.Router:
      return "Router";
    case DeviceType.Host:
      return "Host";
    case DeviceType.Switch:
      return "Switch";
  }
}

function createProgramsTable(
  runner: ProgramRunner,
  runningPrograms: RunningProgram[],
) {
  const onDelete = (row: number) => {
    const { pid } = runningPrograms[row];
    runner.removeRunningProgram(pid);
    refreshElement();
    return true;
  };
  const rows = runningPrograms.map((program) => [
    program.pid.toString(),
    program.name,
    JSON.stringify(program.inputs),
  ]);
  const headers = ["PID", "Name", "Inputs"];
  // TODO: make table editable?
  const table = createTable(headers, rows, { onDelete });
  table.id = "running-programs-table";
  table.classList.add("right-bar-table");
  return table;
}
