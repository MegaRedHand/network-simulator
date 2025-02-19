import { ProgramRunner, RunningProgram } from "../../programs";
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
    this.addRunningProgramsList();
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

  private addRunningProgramsList() {
    this.runningProgramsTable = this.generateProgramsTable();
    this.inputFields.push(this.runningProgramsTable);
  }

  private createProgramsTable(
    runner: ProgramRunner,
    runningPrograms: RunningProgram[],
  ) {
    const onDelete = (row: number) => {
      const { pid } = runningPrograms[row];
      const removedProgram = runner.removeRunningProgram(pid);
      runningPrograms = runningPrograms.filter((p) => p.pid !== pid);
      if (runningPrograms.length === 0) {
        this.refreshTable();
      }
      return removedProgram;
    };
    const rows = runningPrograms.map((program) => [
      program.pid.toString(),
      program.name,
      JSON.stringify(program.inputs),
    ]);
    const headers = ["PID", "Name", "Inputs"];
    // TODO: make table editable?
    const table = createTable(headers, rows, { onDelete });
    table.classList.add("right-bar-table");
    return table;
  }

  private refreshTable() {
    const newTable = this.generateProgramsTable();
    this.runningProgramsTable.replaceWith(newTable);
    this.runningProgramsTable = newTable;
  }

  private generateProgramsTable() {
    const runningPrograms = this.runner.getRunningPrograms();
    if (runningPrograms.length === 0) {
      return document.createElement("table");
    } else {
      return this.createProgramsTable(this.runner, runningPrograms);
    }
  }

  toHTML() {
    return this.inputFields;
  }
}
