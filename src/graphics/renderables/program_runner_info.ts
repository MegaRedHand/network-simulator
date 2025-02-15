import { ProgramRunner, RunningProgram } from "../../programs";
import { refreshElement } from "../../types/viewportManager";
import {
  createDropdown,
  createRightBarButton,
  createTable,
  Renderable,
} from "../right_bar";
import { ProgramInfo } from "./program_info";

export class ProgramRunnerInfo implements Renderable {
  private runner: ProgramRunner;

  private inputFields: Node[] = [];

  private programInputs: HTMLElement;

  constructor(runner: ProgramRunner, programInfos: ProgramInfo[]) {
    this.runner = runner;

    this.addPrograms(programInfos);
  }

  addPrograms(programs: ProgramInfo[]) {
    const programOptions = programs.map(({ name }, i) => {
      return { value: i.toString(), text: name };
    });
    this.programInputs = document.createElement("div");
    let selectedProgram = programs[0];
    this.programInputs.replaceChildren(...selectedProgram.toHTML());
    this.inputFields.push(
      // Dropdown for selecting program
      createDropdown("Program", programOptions, "program-selector", (v) => {
        selectedProgram = programs[parseInt(v)];
        this.programInputs.replaceChildren(...selectedProgram.toHTML());
      }),
      this.programInputs,
      // Button to run program
      createRightBarButton("Start program", () => {
        const { name } = selectedProgram;
        console.log("Started program: ", name);
        const inputs = selectedProgram.getInputValues();
        this.runner.addRunningProgram(name, inputs);
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

  toHTML() {
    return this.inputFields;
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
