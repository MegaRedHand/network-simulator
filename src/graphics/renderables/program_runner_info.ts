import { ProgramRunner, RunningProgram } from "../../programs";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { ALERT_MESSAGES } from "../../utils/constants/alert_constants";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { Button } from "../basic_components/button";
import { Dropdown } from "../basic_components/dropdown";
import { Table } from "../basic_components/table";
import { showError, showSuccess } from "./alert_manager";
import { Renderable } from "./base_info";
import { ProgramInfo } from "./device_info";
import { attachTooltip } from "./tooltip_manager";

export class ProgramRunnerInfo implements Renderable {
  private runner: ProgramRunner;
  private inputFields: Node[] = [];
  private runningProgramsTable: HTMLElement;

  constructor(runner: ProgramRunner, programInfos: ProgramInfo[]) {
    this.runner = runner;
    this.addProgamRunnerLabel();
    this.addPrograms(programInfos);
    this.addRunningProgramsList();
  }

  private addProgamRunnerLabel() {
    const labelElement = document.createElement("div");
    labelElement.className = CSS_CLASSES.CENTRAL_LABEL;
    labelElement.textContent = TOOLTIP_KEYS.PROGRAM_RUNNER;
    attachTooltip(labelElement, TOOLTIP_KEYS.PROGRAM_RUNNER);
    this.inputFields.push(labelElement);
  }
  private addPrograms(programs: ProgramInfo[]) {
    let selectedProgram: ProgramInfo = null;

    const programOptions = programs.map(({ name }, i) => {
      return { value: i.toString(), text: name };
    });
    const programInputs = document.createElement("div");

    // Create the dropdown using the Dropdown class
    const selectProgramDropdown = new Dropdown({
      tooltip: TOOLTIP_KEYS.PROGRAM,
      default_text: TOOLTIP_KEYS.PROGRAM,
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
        if (!selectedProgram) {
          showError(ALERT_MESSAGES.NO_PROGRAM_SELECTED);
          return;
        }
        const { name } = selectedProgram;
        const inputs = selectedProgram.getInputValues();
        if (inputs.some((input) => input === null || input === undefined)) {
          showError(ALERT_MESSAGES.START_PROGRAM_INVALID_INPUT);
          return;
        }
        this.runner.addRunningProgram(name, inputs);
        showSuccess(ALERT_MESSAGES.PROGRAM_STARTED);
        this.refreshTable();
      },
      classList: [
        CSS_CLASSES.RIGHT_BAR_BUTTON,
        CSS_CLASSES.RIGHT_BAR_START_BUTTON,
      ],
      tooltip: TOOLTIP_KEYS.START_PROGRAM,
    });

    this.inputFields.push(
      selectProgramDropdown.toHTML(),
      programInputs,
      startProgramButton.toHTML(),
    );
  }

  private addRunningProgramsList() {
    this.runningProgramsTable = this.generateProgramsTable();
    this.inputFields.push(this.runningProgramsTable);
  }

  private createProgramsTable(
    runner: ProgramRunner,
    runningPrograms: RunningProgram[],
  ): HTMLElement {
    const onDelete = (pid: string) => {
      runner.removeRunningProgram(Number(pid));
      runningPrograms = runningPrograms.filter((p) => p.pid.toString() !== pid);
      if (runningPrograms.length === 0) {
        this.refreshTable();
      }
      return true;
    };

    const rows = runningPrograms.map((program) => ({
      values: [
        program.pid.toString(),
        program.name,
        JSON.stringify(program.inputs),
      ],
      edited: false,
    }));

    const headers = {
      [TOOLTIP_KEYS.PID]: TOOLTIP_KEYS.PID,
      [TOOLTIP_KEYS.NAME]: TOOLTIP_KEYS.NAME,
      [TOOLTIP_KEYS.INPUTS]: TOOLTIP_KEYS.INPUTS,
    };

    const maxRowLength = Math.max(...rows.map((row) => row.values.length));
    const table = new Table({
      headers,
      fieldsPerRow: maxRowLength,
      rows,
      onDelete,
      tableClasses: [CSS_CLASSES.TABLE, CSS_CLASSES.RIGHT_BAR_TABLE], // CSS class for the table
    });

    return table.toHTML();
  }

  private refreshTable() {
    const newTable = this.generateProgramsTable();
    this.runningProgramsTable.replaceWith(newTable);
    this.runningProgramsTable = newTable;
  }

  private generateProgramsTable(): HTMLElement {
    const runningPrograms = this.runner.getRunningPrograms();
    if (runningPrograms.length === 0) {
      return document.createElement("table");
    } else {
      return this.createProgramsTable(this.runner, runningPrograms);
    }
  }

  // Render method to return the content
  toHTML(): Node[] {
    return this.inputFields;
  }
}
