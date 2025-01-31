import {
  DeviceId,
  isRouter,
  RoutingTableEntry,
} from "../types/graphs/datagraph";
import { ViewGraph } from "../types/graphs/viewgraph";

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
    const container = createToggleInfo(title, details, buttonClass, infoClass);
    const infoContent = document.getElementById("info-content");

    if (infoContent) {
      infoContent.appendChild(container);
    }
  }

  // Adds a select dropdown to the right-bar
  addDropdown(
    label: string,
    options: { value: string; text: string }[],
    selectId?: string,
  ) {
    const container = createDropdown(label, options, selectId);
    const infoContent = document.getElementById("info-content");
    if (infoContent) {
      infoContent.appendChild(container);
    }
  }
}

// Function to create a toggle button
function createToggleButton(
  title: string,
  buttonClass: string,
  table: HTMLTableElement,
) {
  const button = document.createElement("button");
  button.classList.add(buttonClass);
  button.textContent = title;

  button.onclick = () => {
    const isHidden = table.classList.contains("hidden");
    table.classList.toggle("hidden", !isHidden);
    button.classList.toggle("open", isHidden);
  };

  return button;
}

function updateRoutingTableUI(
  deviceId: DeviceId,
  newTableData: RoutingTableEntry[],
  viewgraph: ViewGraph,
): void {
  const router = viewgraph.datagraph.getDevice(deviceId);
  if (!router || !isRouter(router)) {
    console.warn(`Device with ID ${deviceId} is not a valid router.`);
    return;
  }
  router.routingTable = newTableData;

  const tableContainer = document.querySelector(".toggle-table-container");
  if (!tableContainer)
    return console.warn("Routing table container not found.");

  const existingTable = tableContainer.querySelector("table");
  if (!existingTable)
    return console.warn("Existing table not found inside container.");

  clearTableRows(existingTable);
  newTableData.forEach((entry) =>
    createTableRow(entry, existingTable, deviceId, viewgraph),
  );
  console.log(`Routing table for router ID ${deviceId} updated successfully.`);
}

function createTable(
  headers: string[],
  rows: string[][],
  tableClass: string,
  viewgraph: ViewGraph,
  deviceId: DeviceId,
): HTMLTableElement {
  const table = document.createElement("table");
  table.classList.add(tableClass, "hidden");

  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });

  const actionsHeader = document.createElement("th");
  actionsHeader.appendChild(createRegenerateButton(deviceId, viewgraph));
  headerRow.appendChild(actionsHeader);
  table.appendChild(headerRow);

  rows.forEach((row) => {
    createTableRow(
      { ip: row[0], mask: row[1], iface: parseInt(row[2].replace("eth", "")) },
      table,
      deviceId,
      viewgraph,
    );
  });

  return table;
}

function clearTableRows(table: HTMLTableElement): void {
  const rows = Array.from(table.querySelectorAll("tr"));
  rows.slice(1).forEach((row) => row.remove()); // Mantener solo el encabezado
}

function createTableRow(
  entry: RoutingTableEntry,
  table: HTMLTableElement,
  deviceId: DeviceId,
  viewgraph: ViewGraph,
): void {
  const rowElement = document.createElement("tr");

  [entry.ip, entry.mask, `eth${entry.iface}`].forEach((cellData, colIndex) => {
    const cell = document.createElement("td");
    cell.textContent = cellData;
    cell.classList.add("editable-cell");
    cell.contentEditable = "true";

    cell.addEventListener("keydown", (event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.stopPropagation(); // Evita que el evento borre la fila en la tabla
      }
    });

    cell.addEventListener("blur", () => {
      const updatedRowIndex =
        Array.from(table.querySelectorAll("tr")).indexOf(rowElement) - 1; // Ajuste dinámico del índice
      const newValue = cell.textContent?.trim() || "";

      let isValid = false;
      if (colIndex === 0) isValid = isValidIP(newValue);
      else if (colIndex === 1) isValid = isValidIP(newValue);
      else if (colIndex === 2) isValid = isValidInterface(newValue);

      if (!isValid) {
        console.warn(`Invalid input for column ${colIndex}: ${newValue}`);
        cell.textContent = cellData; // Revertir cambio si es inválido
        return;
      }

      viewgraph.datagraph.saveManualChange(
        deviceId,
        updatedRowIndex,
        colIndex,
        newValue,
      );
      console.log(
        `Updated cell at row ${updatedRowIndex}, column ${colIndex} with value: ${newValue}`,
      );
    });

    rowElement.appendChild(cell);
  });

  rowElement.appendChild(
    createDeleteButton(rowElement, table, deviceId, viewgraph),
  );
  table.appendChild(rowElement);
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
    const newTableData =
      viewgraph.datagraph.regenerateRoutingTableClean(deviceId);
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
  deviceId: DeviceId,
  viewgraph: ViewGraph,
): HTMLTableCellElement {
  const deleteCell = document.createElement("td");
  const deleteButton = document.createElement("button");
  deleteButton.innerHTML = "🗑️";
  deleteButton.style.border = "none";
  deleteButton.style.background = "transparent";
  deleteButton.style.cursor = "pointer";
  deleteButton.title = "Delete row";

  deleteButton.addEventListener("click", () =>
    handleDeleteRow(rowElement, table, deviceId, viewgraph),
  );

  deleteCell.appendChild(deleteButton);
  return deleteCell;
}

function handleDeleteRow(
  rowElement: HTMLTableRowElement,
  table: HTMLTableElement,
  deviceId: DeviceId,
  viewgraph: ViewGraph,
): void {
  const updatedRowIndex =
    Array.from(table.querySelectorAll("tr")).indexOf(rowElement) - 1; // Ajuste dinámico del índice

  if (updatedRowIndex < 0) {
    console.warn("Cannot delete header row");
    return;
  }

  table.removeChild(rowElement);
  viewgraph.datagraph.removeRoutingTableRow(deviceId, updatedRowIndex);
  console.log(`Deleted row ${updatedRowIndex} from device ${deviceId}`);
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

export function createToggleTable(
  title: string,
  headers: string[],
  rows: string[][],
  viewgraph: ViewGraph,
  deviceId: number,
  buttonClass = "right-bar-toggle-button",
  tableClass = "right-bar-table",
) {
  const container = document.createElement("div");
  container.classList.add("toggle-table-container");

  const table = createTable(headers, rows, tableClass, viewgraph, deviceId);
  const button = createToggleButton(title, buttonClass, table);

  container.appendChild(button);
  container.appendChild(table);

  return container;
}

export function createToggleInfo(
  title: string,
  details: Record<string, string | number | object>,
  buttonClass = "right-bar-toggle-button",
  infoClass = "right-bar-info",
) {
  const container = document.createElement("div");
  container.classList.add("toggle-info-container");

  // Create toggle button
  const button = document.createElement("button");
  button.classList.add(buttonClass);
  button.textContent = "Show Details";

  // Create Packet Details title
  const header = document.createElement("h3");
  header.classList.toggle("hidden", true);
  header.textContent = title;

  // Create info list
  const list = document.createElement("ul");
  list.classList.add(infoClass, "hidden");

  // Add details to the list
  Object.entries(details).forEach(([key, value]) => {
    const listItem = document.createElement("li");
    if (key === "Payload") {
      // Format the payload as JSON
      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(value, null, 2); // Pretty-print JSON
      listItem.innerHTML = `<strong>${key}:</strong>`;
      listItem.appendChild(pre);
    } else {
      listItem.innerHTML = `<strong>${key}:</strong> ${value}`;
    }
    list.appendChild(listItem);
  });

  // Toggle when clicking on button
  button.onclick = () => {
    const isHidden = list.classList.contains("hidden");
    list.classList.toggle("hidden", !isHidden);
    list.classList.toggle("open", isHidden);
    container.classList.toggle("hidden", !isHidden);
    container.classList.toggle("open", isHidden);
    button.classList.toggle("open", isHidden);
    header.classList.toggle("hidden", !isHidden);
    button.textContent = isHidden ? "Hide Details" : "Show Details";
  };

  // Add elements to container
  container.appendChild(button);
  container.appendChild(header);
  container.appendChild(list);

  return container;
}

export function createRightBarButton(
  text: string,
  onClick: () => void,
  buttonClass = "",
  toggleSelected = false,
) {
  const button = document.createElement("button");
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

export function createDropdown(
  label: string,
  options: { value: string; text: string }[],
  selectId?: string,
  onchange: (value: string, event: Event) => void = () => undefined,
) {
  const container = document.createElement("div");
  container.classList.add("dropdown-container");

  const labelElement = document.createElement("label");
  labelElement.textContent = label;
  labelElement.classList.add("right-bar-label");

  const select = document.createElement("select");
  select.classList.add("right-bar-select");
  if (selectId) select.id = selectId;

  options.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.text;
    select.appendChild(option);
  });

  // Default onchange behavior: logs the selected value
  select.onchange = (e) => {
    console.log(`Selected ${label}:`, select.value);
    onchange(select.value, e);
  };

  container.appendChild(labelElement);
  container.appendChild(select);
  return container;
}
