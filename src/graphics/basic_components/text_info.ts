import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { attachTooltip } from "../renderables/tooltip_manager";
import { Table } from "./table";
import { Flags, TCP_FLAGS_KEY } from "../../packets/tcp";

const FLAGS_DATA = {
  tick: "✓",
  cross: "✗",
  tick_data: "1",
  cross_data: "0",
};

export interface InfoField {
  key: string;
  value: string | number | object;
  tooltip?: string;
  editable?: boolean;
  onEdit?: (newValue: string) => void;
}

export class TextInfo {
  private container: HTMLDivElement;
  private list: HTMLUListElement;

  constructor(private title?: string) {
    this.container = document.createElement("div");
    this.container.classList.add(CSS_CLASSES.INFO_CONTAINER); // Apply styling

    // Crear y agregar el título si se proporciona
    if (this.title) {
      const titleElement = document.createElement("h3");
      titleElement.textContent = this.title;
      titleElement.classList.add(CSS_CLASSES.INFO_TITLE);
      this.container.appendChild(titleElement);
      attachTooltip(titleElement, this.title); // Attach tooltip to the title
    }

    this.list = document.createElement("ul");
    this.list.classList.add(CSS_CLASSES.INFO_LIST);

    this.container.appendChild(this.list);
  }

  // Add a field to the info and update the UI dynamically
  addField(
    key: string,
    value: string | number | object | null,
    tooltip?: string,
    editable?: boolean,
    onEdit?: (newValue: string) => void,
  ): void {
    const field: InfoField = { key, value, tooltip, editable, onEdit };

    // Create and append the new field dynamically
    const listItem = this.createListItem(field);
    this.list.appendChild(listItem);
  }

  // Adds a new field to show on the info list, which has a list of values
  addListField(key: string, values: number[], tooltip?: string): void {
    const value = values.length !== 0 ? `[${values.join(", ")}]` : "";
    this.addField(key, value, tooltip);
  }

  // Generate the HTML for the info (used for initial rendering)
  toHTML(): HTMLDivElement {
    return this.container;
  }

  private createListItem(field: InfoField): HTMLLIElement {
    const { key, value, tooltip, editable, onEdit } = field;

    if (key === TCP_FLAGS_KEY) {
      const flags = value as Flags;
      return this.createFlagsElement(flags, tooltip);
    } else if (typeof value === "object" && value !== null) {
      return this.createPayloadElement(key, value, tooltip);
    } else {
      return this.createDetailElement(
        key,
        value as string,
        tooltip,
        editable,
        onEdit,
      );
    }
  }

  // Create a payload element for JSON-like objects
  private createPayloadElement(
    key: string,
    value: object,
    tooltip?: string,
  ): HTMLLIElement {
    // Create the list item that will hold the payload
    const listItem = document.createElement("li");
    listItem.classList.add(CSS_CLASSES.PAYLOAD_ITEM); // Apply styling

    const keyElement = document.createElement("span");
    keyElement.textContent = `${key}`;
    keyElement.classList.add(CSS_CLASSES.DETAIL_KEY);
    keyElement.style.display = CSS_CLASSES.BLOCK;
    keyElement.style.textAlign = "center";
    if (tooltip) {
      attachTooltip(keyElement, tooltip);
    }

    // Create a container to wrap the JSON content
    const preContainer = document.createElement("div");
    preContainer.classList.add(CSS_CLASSES.PAYLOAD_CONTAINER); // Apply styling

    // Create the <pre> element to display formatted JSON
    const pre = document.createElement("pre");
    pre.classList.add(CSS_CLASSES.PAYLOAD_CONTENT); // Apply styling
    pre.textContent = JSON.stringify(value, null, 2); // Pretty-print JSON for readability

    // Append the <pre> element inside its container
    preContainer.appendChild(pre);

    // Append key element and preContainer to the list item
    listItem.appendChild(keyElement);
    listItem.appendChild(preContainer);

    // Return the formatted list item
    return listItem;
  }

  private createDetailElement(
    key: string,
    value: string,
    tooltip?: string,
    editable = false,
    onEdit?: (newValue: string) => void,
  ): HTMLLIElement {
    const listItem = document.createElement("li");
    listItem.classList.add(CSS_CLASSES.DETAIL_ITEM);

    const container = document.createElement("div");
    container.classList.add(CSS_CLASSES.DETAIL_CONTAINER);

    const keyElement = document.createElement("span");
    keyElement.textContent = `${key}`;
    keyElement.classList.add(CSS_CLASSES.DETAIL_KEY);
    if (tooltip) {
      attachTooltip(keyElement, tooltip);
    }

    let valueElement: HTMLElement;
    if (editable) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = value;
      input.classList.add(CSS_CLASSES.DETAIL_VALUE, "editable-field");
      input.addEventListener("change", () => {
        if (onEdit) onEdit(input.value);
      });
      valueElement = input;
    } else {
      valueElement = document.createElement("span");
      valueElement.textContent = value;
      valueElement.classList.add(CSS_CLASSES.DETAIL_VALUE);
    }

    container.appendChild(keyElement);
    container.appendChild(valueElement);
    listItem.appendChild(container);

    return listItem;
  }

  /**
   * Creates a TCP flags display element with ticks and crosses using the Table class
   * @param flags An object containing the TCP flag values
   * @param tooltip Optional tooltip for the flags element
   * @returns HTMLLIElement containing the flags table
   */
  createFlagsElement(flags: Flags, tooltip?: string): HTMLLIElement {
    // Create list item container
    const listItem = document.createElement("li");
    listItem.classList.add(CSS_CLASSES.DETAIL_ITEM);

    // Create key element
    const keyElement = document.createElement("span");
    keyElement.textContent = "TCP Flags";
    keyElement.classList.add(
      CSS_CLASSES.DETAIL_KEY,
      CSS_CLASSES.TCP_FLAG_HEADER,
    );
    keyElement.style.display = CSS_CLASSES.BLOCK;

    if (tooltip) {
      attachTooltip(keyElement, tooltip);
    }

    // Create rows for the table
    const statusRow: string[] = [];
    const valueRow: string[] = [];

    Object.entries(flags).forEach(([, value]) => {
      statusRow.push(value ? FLAGS_DATA.tick : FLAGS_DATA.cross);
      valueRow.push(value ? FLAGS_DATA.tick_data : FLAGS_DATA.cross_data);
    });

    // Create headers for the table
    const headers = Object.keys(flags);

    // Create the table using the Table class
    const flagsTable = new Table({
      headers: headers.reduce(
        (acc, header) => {
          acc[header] = header;
          return acc;
        },
        {} as Record<string, string>,
      ),
      fieldsPerRow: Object.keys(flags).length,
      rows: [statusRow, valueRow],
      tableClasses: [CSS_CLASSES.TABLE, CSS_CLASSES.RIGHT_BAR_TABLE],
    });

    // Get the table element
    const tableElement = flagsTable.toHTML();

    // Apply custom styling to the status row cells (ticks and crosses)
    const tbody = tableElement.querySelector("tbody");
    if (tbody && tbody.rows.length > 0) {
      const statusCells = tbody.rows[0].cells;
      for (const cell of statusCells) {
        if (cell.textContent === "✓") {
          cell.classList.add(CSS_CLASSES.TCP_FLAG_ACTIVE);
        } else {
          cell.classList.add(CSS_CLASSES.TCP_FLAG_INACTIVE);
        }
      }
    }

    // Append elements to list item
    listItem.appendChild(keyElement);
    listItem.appendChild(tableElement);

    return listItem;
  }
}
