import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { attachTooltip } from "../renderables/tooltip_manager";
import { Button } from "./button";

export interface TableRow {
  values: string[];
  edited?: boolean;
}

export interface TableOptions {
  headers: Record<string, string | HTMLElement>; // Custom elements for headers
  fieldsPerRow: number; // Number of fields per row
  rows: TableRow[]; // Table rows
  editableColumns?: boolean[]; // Array indicating which columns are editable
  onEdit?: (
    col: number,
    newValue: string,
    rowHash: Record<string, string>,
  ) => boolean;
  onDelete?: (key: string) => boolean; // Callback for deleting rows by key
  onAddRow?: (values: string[]) => boolean; // Callback for adding rows
  tableClasses?: string[]; // Additional CSS classes for the table
}

export class Table {
  private table: HTMLTableElement;
  private tbody: HTMLTableSectionElement;
  private tableWrapper: HTMLDivElement;

  constructor(private options: TableOptions) {
    this.table = document.createElement("table");
    this.tbody = document.createElement("tbody");

    // Apply custom classes to the table
    if (options.tableClasses) {
      this.table.classList.add(...options.tableClasses);
    }

    this.initializeTable();

    // Create a wrapper for the table
    const wrapper = document.createElement("div");
    wrapper.classList.add(CSS_CLASSES.TABLE_CONTAINER);
    wrapper.appendChild(this.table);

    this.tableWrapper = wrapper;
  }

  private initializeTable(): void {
    this.createHeaderRow();
    this.createRows();
  }

  private createHeaderRow(): void {
    const { headers, fieldsPerRow, onDelete } = this.options;
    const headerRow = document.createElement("tr");

    // Add the defined headers
    Object.entries(headers).forEach(([tooltip, content]) => {
      const th = document.createElement("th");

      // Assign the header content
      if (typeof content === "string") {
        th.textContent = content; // Use text as content
      } else if (content instanceof HTMLElement) {
        th.appendChild(content); // Use HTML element as content
      }

      // Assign the tooltip
      attachTooltip(th, tooltip);

      headerRow.appendChild(th);
    });

    // Calculate the number of empty headers needed
    const headersCount = Object.keys(headers).length;
    const deleteColumn = onDelete ? 1 : 0;
    const totalHeadersNeeded = fieldsPerRow + deleteColumn;
    const emptyHeadersNeeded = Math.max(0, totalHeadersNeeded - headersCount);

    // Add empty headers if necessary
    for (let i = 0; i < emptyHeadersNeeded; i++) {
      const emptyTh = document.createElement("th");
      headerRow.appendChild(emptyTh);
    }

    const thead = document.createElement("thead");
    thead.appendChild(headerRow);
    this.table.appendChild(thead);
  }

  private createRows(): void {
    const { rows, fieldsPerRow, onEdit, onDelete, onAddRow } = this.options;

    rows.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");

      if (row.edited) {
        tr.classList.add("edited-row");
      }

      // Add cells for the row data
      row.values.forEach((cellData, colIndex) => {
        const td = this.createCell(cellData, rowIndex, colIndex, onEdit);
        tr.appendChild(td);
      });

      // Add empty cells if the row has fewer fields than fieldsPerRow
      const emptyCellsNeeded = fieldsPerRow - row.values.length;
      for (let i = 0; i < emptyCellsNeeded; i++) {
        const td = this.createCell("", rowIndex, row.values.length + i, onEdit);
        tr.appendChild(td);
      }

      // Add delete button cell if onDelete is defined
      if (onDelete) {
        const deleteTd = this.createDeleteCell(tr, onDelete);
        tr.appendChild(deleteTd);
      }

      this.tbody.appendChild(tr);
    });

    if (onAddRow) {
      const addTr = this.createAddRow(fieldsPerRow, onAddRow);
      this.tbody.appendChild(addTr);
    }

    this.table.appendChild(this.tbody);
  }

  private createAddRow(
    fieldsPerRow: number,
    onAddRow: (values: string[]) => boolean,
  ): HTMLTableRowElement {
    const addTr = document.createElement("tr");
    addTr.classList.add("add-row");

    const addCells: HTMLTableCellElement[] = [];

    for (let i = 0; i < fieldsPerRow; i++) {
      const td = document.createElement("td");
      td.classList.add("editable-cell");
      td.contentEditable = "true";

      td.addEventListener("keydown", (event) => {
        if (event.key === "Delete" || event.key === "Backspace") {
          event.stopPropagation();
        }
      });
      addTr.appendChild(td);
      addCells.push(td);
    }

    const addTd = document.createElement("td");
    const addButton = new Button({
      text: "➕",
      classList: [CSS_CLASSES.TABLE_BUTTON],
      tooltip: TOOLTIP_KEYS.ADD_ENTRY_BUTTON,
      onClick: () => {
        const values = addCells.map((cell) => cell.textContent?.trim() || "");
        const added = onAddRow(values);
        if (added) {
          addCells.forEach((cell) => (cell.textContent = ""));
        }
      },
    });
    addTd.appendChild(addButton.toHTML());
    addTr.appendChild(addTd);

    return addTr;
  }

  private createCell(
    cellData: string,
    rowIndex: number,
    colIndex: number,
    onEdit?: (
      col: number,
      newValue: string,
      rowHash: Record<string, string>,
    ) => boolean,
  ): HTMLTableCellElement {
    const td = document.createElement("td");
    td.textContent = cellData;

    // Check if the column is editable
    const isEditable = this.options.editableColumns?.[colIndex] ?? false;

    if (isEditable && onEdit) {
      this.makeEditable(td, rowIndex, colIndex, onEdit);
    }

    return td;
  }

  private createDeleteCell(
    tr: HTMLTableRowElement,
    onDelete: (key: string) => boolean,
  ): HTMLTableCellElement {
    const deleteTd = document.createElement("td");
    const deleteButton = new Button({
      text: "🗑️",
      classList: [CSS_CLASSES.TABLE_BUTTON],
      tooltip: TOOLTIP_KEYS.DELETE_ENTRY_BUTTON,
      onClick: () => {
        const key = tr.cells[0]?.textContent?.trim() || "";
        if (key && onDelete(key)) {
          this.tbody.removeChild(tr);
        }
      },
    });
    deleteTd.appendChild(deleteButton.toHTML());
    return deleteTd;
  }

  makeEditable(
    cell: HTMLTableCellElement,
    rowIndex: number,
    colIndex: number,
    onEdit: (
      col: number,
      newValue: string,
      rowHash: Record<string, string>,
    ) => boolean,
  ) {
    cell.classList.add("editable-cell");
    cell.contentEditable = "true";
    const originalContent = cell.textContent;

    let originalRowHash: Record<string, string> = {};

    cell.addEventListener("focus", () => {
      originalRowHash = this.getRowHash(rowIndex);
    });

    cell.addEventListener("keydown", (event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.stopPropagation();
      }
      if (event.key === "C" || event.key === "c") {
        event.stopPropagation();
      }
    });

    cell.addEventListener("blur", () => {
      const newValue = cell.textContent?.trim() || "";

      const isValid = onEdit(colIndex, newValue, originalRowHash);

      if (!isValid) {
        console.warn(
          `Invalid or same input for column ${colIndex}: ${newValue}`,
        );
        cell.textContent = originalContent;
        return;
      }
    });
  }

  // New method to update rows dynamically
  updateRows(newRows: TableRow[]): void {
    this.clearTableRows(); // Clear existing rows
    this.options.rows = newRows; // Update the rows in options
    this.createRows();
  }

  private clearTableRows(): void {
    this.tbody.innerHTML = ""; // Clear all rows from tbody
  }

  toHTML(): HTMLElement {
    return this.tableWrapper;
  }

  getRowHash(rowIndex: number): Record<string, string> {
    const row = this.tbody.rows[rowIndex];
    const hash: Record<string, string> = {};
    const headerKeys = Object.keys(this.options.headers);
    if (!row) return hash;
    Array.from(row.cells).forEach((cell, i) => {
      if (!cell.querySelector("button")) {
        const key = headerKeys[i] ?? `col${i}`;
        hash[key] = cell.textContent?.trim() || "";
      }
    });
    return hash;
  }
}
