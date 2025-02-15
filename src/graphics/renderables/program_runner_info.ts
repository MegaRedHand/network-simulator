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

  private runningProgramsTable: HTMLTableElement;

  constructor(runner: ProgramRunner, programInfos: ProgramInfo[]) {
    this.runner = runner;

    this.addPrograms(programInfos);
    this.addRunningProgramsList(runner);
  }

  private addPrograms(programs: ProgramInfo[]) {
    let selectedProgram = programs[0];

    const programOptions = programs.map(({ name }, i) => {
      return { value: i.toString(), text: name };
    });
    const programInputs = document.createElement("div");
    programInputs.replaceChildren(...selectedProgram.toHTML());
    // Dropdown for selecting program
    const selectProgramDropdown = createDropdown(
      "Program",
      programOptions,
      "program-selector",
      (v) => {
        selectedProgram = programs[parseInt(v)];
        programInputs.replaceChildren(...selectedProgram.toHTML());
      },
    );
    // Button to run program
    const startProgramButton = createRightBarButton("Start program", () => {
      const { name } = selectedProgram;
      console.log("Started program: ", name);
      const inputs = selectedProgram.getInputValues();
      this.runner.addRunningProgram(name, inputs);
      this.refreshTable();
    });
    this.inputFields.push(
      selectProgramDropdown,
      programInputs,
      startProgramButton,
    );
  }

  private addRunningProgramsList(runner: ProgramRunner) {
    const runningPrograms = runner.getRunningPrograms();
    if (runningPrograms.length === 0) {
      return;
    }
    const table = this.createProgramsTable(runner, runningPrograms);
    this.runningProgramsTable = table;
    this.inputFields.push(table);
  }

  private createProgramsTable(
    runner: ProgramRunner,
    runningPrograms: RunningProgram[],
  ) {
    const onDelete = (row: number) => {
      const { pid } = runningPrograms[row];
      runner.removeRunningProgram(pid);
      this.refreshTable();
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

  private refreshTable() {
    const runningPrograms = this.runner.getRunningPrograms();
    let newTable;
    if (runningPrograms.length === 0) {
      newTable = document.createElement("table");
    } else {
      newTable = this.createProgramsTable(this.runner, runningPrograms);
    }
    this.runningProgramsTable.replaceWith(newTable);
  }

  toHTML() {
    return this.inputFields;
  }
}
