import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { attachTooltip } from "../renderables/tooltip_manager";
import { Table } from "./table";

export interface InfoField {
  key: string;
  value: string | number | object;
  tooltip?: string;
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
    value: string | number | object,
    tooltip?: string,
  ): void {
    const field: InfoField = { key, value, tooltip };

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

  // Create a list item dynamically based on the field type
  private createListItem(field: InfoField): HTMLLIElement {
    const { key, value, tooltip } = field;

    if (key === "tcp_flags") {
      // TODO: Use a Flag interface, this is a temporary solution
      if (
        typeof value === "object" &&
        value !== null &&
        "Urg" in value &&
        "Ack" in value &&
        "Psh" in value &&
        "Rst" in value &&
        "Syn" in value &&
        "Fin" in value
      ) {
        return this.createFlagsElement(
          value as {
            Urg: number;
            Ack: number;
            Psh: number;
            Rst: number;
            Syn: number;
            Fin: number;
          },
        );
      } else {
        throw new Error("Invalid value type for TCP Flags");
      }
    } else if (typeof value === "object" && value !== null) {
      return this.createPayloadElement(key, value, tooltip);
    } else {
      return this.createDetailElement(key, value as string, tooltip);
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

  // Create a regular detail element
  private createDetailElement(
    key: string,
    value: string,
    tooltip?: string,
  ): HTMLLIElement {
    const listItem = document.createElement("li");
    listItem.classList.add(CSS_CLASSES.DETAIL_ITEM); // Apply styling

    const container = document.createElement("div");
    container.classList.add(CSS_CLASSES.DETAIL_CONTAINER); // Apply styling

    const keyElement = document.createElement("span");
    keyElement.textContent = `${key}`;
    keyElement.classList.add(CSS_CLASSES.DETAIL_KEY);
    if (tooltip) {
      attachTooltip(keyElement, tooltip);
    }

    const valueElement = document.createElement("span");
    valueElement.textContent = value;
    valueElement.classList.add(CSS_CLASSES.DETAIL_VALUE);

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
  createFlagsElement(
    flags: {
      Urg: number;
      Ack: number;
      Psh: number;
      Rst: number;
      Syn: number;
      Fin: number;
    },
    tooltip?: string,
  ): HTMLLIElement {
    // Create list item container
    const listItem = document.createElement("li");
    listItem.classList.add(CSS_CLASSES.DETAIL_ITEM);

    // Create key element
    const keyElement = document.createElement("span");
    keyElement.textContent = "TCP Flags";
    keyElement.classList.add(CSS_CLASSES.DETAIL_KEY);
    keyElement.style.display = CSS_CLASSES.BLOCK;
    keyElement.style.textAlign = "center";
    keyElement.style.marginBottom = "8px";

    if (tooltip) {
      attachTooltip(keyElement, tooltip);
    }

    // Create rows for the table
    const statusRow: string[] = [];
    const valueRow: string[] = [];

    Object.entries(flags).forEach(([, value]) => {
      const isSet = value === 1;
      statusRow.push(isSet ? "✓" : "✗");
      valueRow.push(value ? "1" : "0");
    });

    // Create headers for the table
    // TODO: Use a Flag interface, this is a temporary solution
    const headers = Object.keys(flags).map((flag) => flag.toUpperCase());

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
