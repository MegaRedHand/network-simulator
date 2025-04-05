import { ProgramRunner, RunningProgram } from "../../programs";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { Dropdown } from "../basic_components/dropdown";
import { createRightBarButton, createTable, Renderable } from "../right_bar";
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

    // Create the dropdown using the Dropdown class
    const selectProgramDropdown = new Dropdown({
      label: TOOLTIP_KEYS.PROGRAM,
      tooltip: TOOLTIP_KEYS.PROGRAM,
      options: programOptions,
      onchange: (v) => {
        selectedProgram = programs[parseInt(v)];
        console.log("Selected program: ", selectedProgram.name);
        programInputs.replaceChildren(...selectedProgram.toHTML());
      },
    });
    // Button to run program
    const startProgramButton = createRightBarButton(
      TOOLTIP_KEYS.START_PROGRAM,
      () => {
        const { name } = selectedProgram;
        console.log("Started program: ", name);
        const inputs = selectedProgram.getInputValues();
        // Validar que se hayan proporcionado todas las entradas necesarias
        if (inputs.some((input) => input === null || input === undefined)) {
          console.error("Some inputs are missing or invalid.");
          return;
        }
        this.runner.addRunningProgram(name, inputs);
        this.refreshTable();
      },
      "right-bar-start-button",
    );
    this.inputFields.push(
      selectProgramDropdown.render(),
      programInputs,
      startProgramButton,
    );
  }

  private addRunningProgramsList() {
    this.runningProgramsTable = this.generateProgramsTable();
    this.inputFields.push(this.runningProgramsTable);
    this.inputFields.push(document.createElement("br"));
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
