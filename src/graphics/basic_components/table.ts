import { CSS_CLASSES } from "../../utils/constants/css_constants";
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
  onEdit?: (row: number, col: number, newValue: string) => boolean; // Callback for editing cells
  onDelete?: (row: number) => boolean; // Callback for deleting rows
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
    onEdit?: (row: number, col: number, newValue: string) => boolean,
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
    onDelete: (row: number) => boolean,
  ): HTMLTableCellElement {
    const deleteTd = document.createElement("td");
    const deleteButton = new Button({
      text: "🗑️",
      classList: [CSS_CLASSES.TABLE_BUTTON],
      onClick: () => {
        const index = Array.from(this.tbody.rows).indexOf(tr); // Calculate the index of the row
        if (index !== -1 && onDelete(index)) {
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
    onEdit: (row: number, col: number, newValue: string) => boolean,
  ) {
    cell.classList.add("editable-cell");
    cell.contentEditable = "true";
    const originalContent = cell.textContent;

    // Prevent deleting the row while editing
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.stopPropagation();
      }
    });

    // Handle edits
    cell.addEventListener("blur", () => {
      const newValue = cell.textContent?.trim() || "";

      const isValid = onEdit(rowIndex, colIndex, newValue);

      if (!isValid) {
        console.warn(`Invalid input for column ${colIndex}: ${newValue}`);
        cell.textContent = originalContent; // Revert change if invalid
        return;
      }

      console.log(
        `Updated cell at row ${rowIndex}, column ${colIndex} with value: ${newValue}`,
      );
    });
  }

  // New method to update rows dynamically
  updateRows(newRows: TableRow[]): void {
    this.clearTableRows(); // Clear existing rows
    this.options.rows = newRows; // Update the rows in options
    console.log("Updated rows:", this.options.rows); // Log the updated rows
    this.createRows();
  }

  private clearTableRows(): void {
    this.tbody.innerHTML = ""; // Clear all rows from tbody
  }

  toHTML(): HTMLElement {
    return this.tableWrapper;
  }
}
