import {
  DeviceId,
  isRouter,
  RoutingTableEntry,
} from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";
import { TOOLTIP_KEYS } from "../utils/constants/tooltips_constants";
import { TooltipManager } from "./renderables/tooltip_manager";

export { StyledInfo } from "./renderables/styled_info";
export { DeviceInfo } from "./renderables/device_info";

export interface Renderable {
  toHTML(): Node[];
}

export class RightBar {
  private static instance: RightBar | null = null; // Singleton
  private rightBar: HTMLElement;

  private constructor(rightBar: HTMLElement) {
    this.rightBar = rightBar;
    this.initializeBaseContent();
  }

  // Static method to get the unique instance of RightBar
  static getInstance() {
    // If an instance already exists, return it. If not, create it.
    if (!RightBar.instance) {
      const rightBarElement = document.getElementById("right-bar");
      if (!rightBarElement) {
        console.error("Element with ID 'right-bar' not found.");
        return null;
      }
      RightBar.instance = new RightBar(rightBarElement);
    }
    return RightBar.instance;
  }

  // Initializes the base title and info container (called only once)
  private initializeBaseContent() {
    const title = document.createElement("h2");
    title.textContent = "Information";
    this.rightBar.appendChild(title);

    const infoContent = document.createElement("div");
    infoContent.id = "info-content";
    this.rightBar.appendChild(infoContent);
  }

  // Method to clear only the content of info-content
  clearContent() {
    const infoContent = this.rightBar.querySelector("#info-content");
    if (infoContent) {
      infoContent.innerHTML = ""; // Clears only the content of info-content
    }
  }

  // Shows specific information of an element in info-content
  renderInfo(info: Renderable) {
    const infoContent = document.getElementById("info-content");
    if (infoContent) {
      infoContent.replaceChildren(...info.toHTML());
    }
  }

  // Adds a standard button to the right-bar
  addButton(
    text: string,
    onClick: () => void,
    buttonClass = "",
    toggleSelected = false,
  ) {
    const button = createRightBarButton(
      text,
      onClick,
      buttonClass,
      toggleSelected,
    );
    const infoContent = document.getElementById("info-content");
    if (infoContent) {
      infoContent.appendChild(button);
    }
  }

  addToggleButton(
    title: string,
    details: Record<string, string | number | object>,
    buttonClass = "right-bar-toggle-button",
    infoClass = "right-bar-info",
  ) {
    const container = createToggleInfo({
      title,
      details,
      buttonClass,
      infoClass,
    });
    const infoContent = document.getElementById("info-content");

    if (infoContent) {
      infoContent.appendChild(container);
    }
  }

  // Adds a select dropdown to the right-bar
  addDropdown(label: string, options: { value: string; text: string }[]) {
    const container = createDropdown(label, options);
    const infoContent = document.getElementById("info-content");
    if (infoContent) {
      infoContent.appendChild(container.container);
    }
  }
}

// Function to create a toggle button
export function createToggleButton(
  title: string,
  buttonClass: string,
  element: HTMLElement,
) {
  const button = document.createElement("button");
  button.classList.add(buttonClass);
  button.textContent = title;

  button.onclick = () => {
    element.classList.toggle("hidden");
    button.classList.toggle("open");
  };

  return button;
}

export function createRoutingTable(
  title: string,
  headers: string[],
  rows: string[][],
  viewgraph: ViewGraph,
  deviceId: number,
) {
  const container = document.createElement("div");
  const tableWrapper = document.createElement("div");
  tableWrapper.classList.add("table-wrapper");
  const tableClasses = ["right-bar-table", "hidden", "toggle-table"];
  const buttonClass = "right-bar-toggle-button";

  const regenerateButton = createRegenerateButton(deviceId, viewgraph);
  const { onEdit, onDelete } = routingTableCallbacks(viewgraph, deviceId);
  const options = { onEdit, onDelete, specialButton: regenerateButton };
  const table = createTable(headers, rows, options);
  table.classList.add(...tableClasses);
  const button = createToggleButton(title, buttonClass, table);

  TooltipManager.getInstance().attachTooltip(
    button,
    TOOLTIP_KEYS.ROUTING_TABLE,
  );

  tableWrapper.appendChild(table);
  container.appendChild(button);
  container.appendChild(tableWrapper);
  return container;
}

function updateRoutingTableUI(
  deviceId: DeviceId,
  newTableData: RoutingTableEntry[],
  viewgraph: ViewGraph,
): void {
  const router = viewgraph.getDataGraph().getDevice(deviceId);
  if (!router || !isRouter(router)) {
    console.warn(`Device with ID ${deviceId} is not a valid router.`);
    return;
  }
  router.routingTable = newTableData;

  const existingTable: HTMLTableElement | null =
    document.querySelector("table.toggle-table");

  if (!existingTable)
    return console.warn("Existing table not found inside container.");

  clearTableRows(existingTable);
  newTableData.forEach((entry) => {
    const row = [entry.ip, entry.mask, `eth${entry.iface}`];
    const { onEdit, onDelete } = routingTableCallbacks(viewgraph, deviceId);
    createTableRow(row, existingTable, onEdit, onDelete);
  });
  console.log(`Routing table for router ID ${deviceId} updated successfully.`);
}

type OnEditCallback = (row: number, col: number, newValue: string) => boolean;
type OnDeleteCallback = (row: number) => boolean;

interface TableOptions {
  onEdit?: OnEditCallback;
  onDelete?: OnDeleteCallback;
  specialButton?: HTMLElement;
}

export function createTable(
  headers: string[],
  rows: string[][],
  options: TableOptions = {},
): HTMLTableElement {
  const { onEdit, onDelete, specialButton } = options;
  const table = document.createElement("table");

  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;

    TooltipManager.getInstance().attachTooltip(th, header);

    headerRow.appendChild(th);
  });

  const actionsHeader = document.createElement("th");
  if (specialButton) {
    actionsHeader.appendChild(specialButton);
  }
  headerRow.appendChild(actionsHeader);
  table.appendChild(headerRow);

  rows.forEach((row) => {
    createTableRow(row, table, onEdit, onDelete);
  });

  return table;
}

function clearTableRows(table: HTMLTableElement): void {
  const rows = Array.from(table.querySelectorAll("tr"));
  rows.slice(1).forEach((row) => row.remove()); // Keep the header only
}

function createTableRow(
  row: string[],
  table: HTMLTableElement,
  onEdit?: OnEditCallback,
  onDelete?: OnDeleteCallback,
): void {
  const rowElement = document.createElement("tr");
  table.appendChild(rowElement);

  row.forEach((cellData, colIndex) => {
    const cell = document.createElement("td");
    cell.textContent = cellData;

    rowElement.appendChild(cell);

    const rowIndex = rowElement.rowIndex;
    // Ignore header row
    if (rowIndex !== 0 && onEdit) {
      makeEditable(rowIndex - 1, colIndex, cell, onEdit);
    }
  });

  rowElement.appendChild(createDeleteButton(rowElement, table, onDelete));
}

function makeEditable(
  rowIndex: number,
  colIndex: number,
  cell: HTMLTableCellElement,
  onEdit: OnEditCallback,
) {
  cell.classList.add("editable-cell");
  cell.contentEditable = "true";
  const originalContent = cell.textContent;

  // Avoid deleting the router while editing
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

function createRegenerateButton(
  deviceId: DeviceId,
  viewgraph: ViewGraph,
): HTMLButtonElement {
  const regenerateAllButton = document.createElement("button");
  regenerateAllButton.innerHTML = "🔄";
  regenerateAllButton.style.border = "none";
  regenerateAllButton.style.background = "transparent";
  regenerateAllButton.style.cursor = "pointer";
  regenerateAllButton.style.fontSize = "1.2em";
  regenerateAllButton.title = "Regenerate Full Routing Table";

  regenerateAllButton.addEventListener("click", () => {
    console.log(`Regenerating full routing table for device ${deviceId}`);
    const newTableData = viewgraph
      .getDataGraph()
      .regenerateRoutingTableClean(deviceId);
    if (!newTableData.length) {
      console.warn("Failed to regenerate routing table.");
      return;
    }
    updateRoutingTableUI(deviceId, newTableData, viewgraph);
  });

  return regenerateAllButton;
}

function createDeleteButton(
  rowElement: HTMLTableRowElement,
  table: HTMLTableElement,
  onDelete: OnDeleteCallback,
): HTMLTableCellElement {
  const deleteCell = document.createElement("td");
  const deleteButton = document.createElement("button");
  deleteButton.innerHTML = "🗑️";
  deleteButton.style.border = "none";
  deleteButton.style.background = "transparent";
  deleteButton.style.cursor = "pointer";
  deleteButton.title = "Delete row";

  deleteButton.addEventListener("click", () => {
    // Ignore header updates. They shouldn't happen anyways.
    if (rowElement.rowIndex === 0) {
      return;
    }
    // Don't count the header row
    const rowIndex = rowElement.rowIndex - 1;
    const isValid = onDelete(rowIndex);
    if (!isValid) {
      return;
    }
    table.removeChild(rowElement);
    console.log(`Deleted row ${rowIndex}`);
  });

  deleteCell.appendChild(deleteButton);
  return deleteCell;
}

function routingTableCallbacks(viewgraph: ViewGraph, deviceId: DeviceId) {
  const onEdit = (row: number, col: number, newValue: string) => {
    let isValid = false;
    if (col === 0) isValid = isValidIP(newValue);
    else if (col === 1) isValid = isValidIP(newValue);
    else if (col === 2) isValid = isValidInterface(newValue);

    if (isValid) {
      viewgraph.getDataGraph().saveManualChange(deviceId, row, col, newValue);
    }
    return isValid;
  };
  const onDelete = (row: number) => {
    viewgraph.getDataGraph().removeRoutingTableRow(deviceId, row);
    return true;
  };
  return { onEdit, onDelete };
}

// Function to validate IP format
function isValidIP(ip: string): boolean {
  const ipPattern =
    /^(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)$/;
  return ipPattern.test(ip);
}

// Function to validate Interface format (ethX where X is a number)
function isValidInterface(interfaceStr: string): boolean {
  const interfacePattern = /^eth[0-9]+$/;
  return interfacePattern.test(interfaceStr);
}

interface ToggleInfoConfig {
  title: string;
  details: Record<string, string | number | object>;
  buttonClass?: string;
  infoClass?: string;
}

// Function to create warning element
function createWarningElement(key: string, value: string): HTMLLIElement {
  const listItem = document.createElement("li");
  const warningSign = document.createElement("div");
  warningSign.classList.add("warning-sign");

  const warningTitle = document.createElement("h3");
  warningTitle.classList.add("warning-title");
  warningTitle.textContent = key;

  const warningMessage = document.createElement("p");
  warningMessage.classList.add("warning-message");
  warningMessage.textContent = String(value);

  warningSign.appendChild(warningTitle);
  warningSign.appendChild(warningMessage);
  listItem.appendChild(warningSign);

  return listItem;
}

// Function to create a payload element
function createPayloadElement(key: string, value: object): HTMLLIElement {
  // Create the list item that will hold the payload
  const listItem = document.createElement("li");
  listItem.classList.add("payload-item"); // Apply styling

  // Create the key (title) element for the payload
  const keyElement = document.createElement("strong");
  keyElement.classList.add("payload-key");
  keyElement.textContent = `${key}:`; // Set the text content

  // Create a container to wrap the JSON content
  const preContainer = document.createElement("div");
  preContainer.classList.add("payload-container"); // Apply styling

  // Create the <pre> element to display formatted JSON
  const pre = document.createElement("pre");
  pre.classList.add("payload-content");
  pre.textContent = JSON.stringify(value, null, 2); // Pretty-print JSON for readability

  // Append the <pre> element inside its container
  preContainer.appendChild(pre);

  // Append key element and preContainer to the list item
  listItem.appendChild(keyElement);
  listItem.appendChild(preContainer);

  // Return the formatted list item
  return listItem;
}

// Function to create a regular detail element
function createDetailElement(key: string, value: string): HTMLLIElement {
  // Create the list item that will hold the detail
  const listItem = document.createElement("li");
  listItem.classList.add("detail-item"); // Apply styling

  // Create a container to keep key and value aligned in the same row
  const container = document.createElement("div");
  container.classList.add("detail-container");

  // Create the key element (label)
  const keyElement = document.createElement("span");
  keyElement.classList.add("detail-key");
  keyElement.textContent = `${key}:`; // Set the text content

  // Create the value element
  const valueElement = document.createElement("span");
  valueElement.classList.add("detail-value");
  valueElement.textContent = value; // Set the text content

  // Append key and value elements to the container
  container.appendChild(keyElement);
  container.appendChild(valueElement);

  // Append the container to the list item
  listItem.appendChild(container);

  // Return the formatted list item
  return listItem;
}

// Function to create toggle button
function createInfoToggleButton(
  buttonClass: string,
  list: HTMLUListElement,
  container: HTMLDivElement,
  header: HTMLHeadingElement,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.classList.add(buttonClass);
  button.textContent = "Show Details";

  button.onclick = () => {
    const isHidden = list.classList.contains("hidden");

    if (isHidden) {
      list.classList.remove("hidden");
      header.classList.remove("hidden");
      button.textContent = "Hide Details";
      button.classList.add("open");
    } else {
      list.classList.add("hidden");
      header.classList.add("hidden");
      button.textContent = "Show Details";
      button.classList.remove("open");
    }
  };

  return button;
}

export function createToggleInfo({
  title,
  details,
  buttonClass = "right-bar-toggle-button",
  infoClass = "right-bar-info",
}: ToggleInfoConfig): HTMLDivElement {
  const container = document.createElement("div");
  container.classList.add("toggle-info-container");

  const header = document.createElement("h3");
  header.classList.toggle("hidden", true);
  header.textContent = title;

  const list = document.createElement("ul");
  list.classList.add(infoClass, "hidden");

  // Process details before creating the button
  Object.entries(details).forEach(([key, value]) => {
    let listItem: HTMLLIElement;

    if (typeof value === "object" && value !== null) {
      listItem = createPayloadElement(key, value);
    } else if (key === "Warning") {
      listItem = createWarningElement(key, value as string);
    } else {
      listItem = createDetailElement(key, value as string);
    }

    list.appendChild(listItem);
  });

  // Move the button outside the `toggle-info-container`
  const button = createInfoToggleButton(buttonClass, list, container, header);
  const wrapper = document.createElement("div"); // New wrapper for structural consistency
  wrapper.appendChild(button);
  wrapper.appendChild(container); // Now the container is separate from the button

  container.appendChild(header);
  container.appendChild(list);

  return wrapper; // Return the wrapper that contains the button and the info container
}

export function createRightBarButton(
  text: string,
  onClick: () => void,
  buttonClass = "",
  toggleSelected = false,
) {
  const button = document.createElement("button");
  TooltipManager.getInstance().attachTooltip(button, text);
  button.classList.add("right-bar-button");
  if (buttonClass) {
    button.classList.add(...buttonClass.split(" "));
  }
  button.textContent = text;
  button.onclick = () => {
    onClick();
    if (toggleSelected) {
      button.classList.toggle("selected-button"); // Changes color on click
    }
  };
  return button;
}

/**
 * Creates a custom dropdown component with a label, options, and an optional onchange handler.
 *
 * @param label - The text to display as the label for the dropdown.
 * @param options - An array of objects representing the dropdown options. Each object should have:
 *   - `value`: The value associated with the option.
 *   - `text`: The text to display for the option.
 * @param selectId - (Optional) An ID to assign to the dropdown for identification purposes.
 * @param onchange - (Optional) A callback function triggered when an option is selected.
 *                   Receives the selected value and the event as arguments.
 *                   Defaults to a no-op function.
 * @returns An object containing:
 *   - `container`: The DOM element representing the dropdown container.
 *   - `getValue`: A function to retrieve the currently selected value, or `null` if no option is selected.
 *
 * @remarks
 * - The dropdown uses a custom design with a "selected option" display and a toggleable options container.
 * - Tooltips are attached to each option using the `attachTooltip` function.
 * - Invalid options in the `options` array are logged as warnings and skipped.
 * - The dropdown's options container is toggled open/closed when the selected option is clicked.
 */
export function createDropdown(
  label: string,
  options: { value: string; text: string }[],
  onchange: (value: string, event: Event) => void = () => undefined,
) {
  // Create the main dropdown container
  const container = document.createElement("div");
  container.classList.add("dropdown-container");

  // Create and set up the label element
  const labelElement = document.createElement("label");
  labelElement.innerHTML = `<strong>${label}</strong>`; // Use innerHTML for consistency

  // Attach tooltip to the label
  TooltipManager.getInstance().attachTooltip(labelElement, label);

  // Append the label to the container
  container.appendChild(labelElement);

  // Create the custom dropdown element
  const dropdown = document.createElement("div");
  dropdown.classList.add("custom-dropdown");

  // Create the element displaying the selected option
  const selected = document.createElement("div");

  // Attach tooltip to the selected
  TooltipManager.getInstance().attachTooltip(selected, label);
  selected.classList.add("selected-option");
  selected.textContent = "Select" + (label ? ` ${label}` : "");
  dropdown.appendChild(selected);

  // Create the container for dropdown options
  const optionsContainer = document.createElement("div");
  optionsContainer.classList.add("options-container");

  let selectedValue: string | null = null; // Store the selected value

  // Loop through each option and create its corresponding DOM element
  options.forEach((optionData) => {
    // Validate the option object
    if (
      !optionData ||
      typeof optionData.value !== "string" ||
      typeof optionData.text !== "string"
    ) {
      console.warn("Invalid option data:", optionData);
      return;
    }

    // Create an element for the option
    const option = document.createElement("div");
    option.classList.add("dropdown-option");
    option.textContent = optionData.text;
    console.log("Attaching tooltip to", optionData.text);
    TooltipManager.getInstance().attachTooltip(option, optionData.text); // Attach tooltip to the option

    // Set up click event for option selection
    option.onclick = (e) => {
      console.log("Selected option value:", optionData.value);
      selected.textContent = optionData.text;
      selectedValue = optionData.value;
      optionsContainer.classList.remove("show"); // Close the options container
      onchange(optionData.value, e); // Trigger the onchange callback
    };

    optionsContainer.appendChild(option); // Append option to container
  });

  // Toggle the dropdown options visibility when clicking the selected option
  selected.onclick = () => {
    optionsContainer.classList.toggle("show");
  };

  dropdown.appendChild(optionsContainer);
  container.appendChild(labelElement);
  container.appendChild(dropdown);

  return { container, getValue: () => selectedValue }; // Return dropdown container and getValue function
}
