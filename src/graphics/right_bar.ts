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

export function createToggleTable(
  title: string,
  headers: string[],
  rows: string[][],
  buttonClass = "right-bar-toggle-button",
  tableClass = "right-bar-table",
) {
  const container = document.createElement("div");
  container.classList.add("toggle-table-container");

  // Create toggle button
  const button = document.createElement("button");
  button.classList.add(buttonClass);
  button.textContent = title;

  // Create table
  const table = document.createElement("table");
  table.classList.add(tableClass, "hidden");

  // Add headers
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Add rows
  rows.forEach((row) => {
    const rowElement = document.createElement("tr");
    row.forEach((cellData) => {
      const cell = document.createElement("td");
      cell.textContent = cellData;
      rowElement.appendChild(cell);
    });
    table.appendChild(rowElement);
  });

  // Toggle when clicking on button
  button.onclick = () => {
    const isHidden = table.classList.contains("hidden");
    table.classList.toggle("hidden", !isHidden);
    table.classList.toggle("open", isHidden);
    container.classList.toggle("hidden", !isHidden);
    container.classList.toggle("open", isHidden);
    button.classList.toggle("open", isHidden);
  };

  // Add button and table to container
  container.appendChild(button);
  container.appendChild(table);

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
  select.onchange = () => {
    console.log(`Selected ${label}:`, select.value);
  };

  container.appendChild(labelElement);
  container.appendChild(select);
  return container;
}
