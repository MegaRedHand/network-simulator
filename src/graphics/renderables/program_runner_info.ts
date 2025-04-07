import { ProgramRunner, RunningProgram } from "../../programs";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { Button } from "../basic_components/button";
import { Dropdown } from "../basic_components/dropdown";
import { Table } from "../basic_components/table";
import { Renderable } from "./base_info";
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
        programInputs.replaceChildren(...selectedProgram.toHTML());
      },
    });
    // Button to run program
    const startProgramButton = new Button({
      text: TOOLTIP_KEYS.START_PROGRAM,
      onClick: () => {
        const { name } = selectedProgram;
        const inputs = selectedProgram.getInputValues();
        if (inputs.some((input) => input === null || input === undefined)) {
          console.error("Some inputs are missing or invalid.");
          return;
        }
        this.runner.addRunningProgram(name, inputs);
        this.refreshTable();
      },
      classList: [
        CSS_CLASSES.RIGHT_BAR_BUTTON,
        CSS_CLASSES.RIGHT_BAR_START_BUTTON,
      ],
      tooltip: TOOLTIP_KEYS.START_PROGRAM,
    });

    this.inputFields.push(
      selectProgramDropdown.render(),
      programInputs,
      startProgramButton.render(),
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
    const headers = {
      [TOOLTIP_KEYS.PID]: TOOLTIP_KEYS.PID,
      [TOOLTIP_KEYS.NAME]: TOOLTIP_KEYS.NAME,
      [TOOLTIP_KEYS.INPUTS]: TOOLTIP_KEYS.INPUTS,
    };

    const maxRowLength = Math.max(...rows.map((row) => row.length));
    const table = new Table({
      headers,
      fieldsPerRow: maxRowLength,
      rows,
      onDelete,
      tableClasses: [CSS_CLASSES.RIGHT_BAR_TABLE], // CSS class for the table
    });

    return table.render();
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
