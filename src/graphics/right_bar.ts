export class RightBar {
  private static instance: RightBar | null = null; // Unique instance
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
  renderInfo(title: string, info: { label: string; value: string }[]) {
    this.clearContent(); // Clears before adding new content

    const infoContent = document.getElementById("info-content");
    if (infoContent) {
      const header = document.createElement("h3");
      header.textContent = title;
      infoContent.appendChild(header);

      info.forEach((item) => {
        const p = document.createElement("p");
        p.innerHTML = `<strong>${item.label}:</strong> ${item.value}`;
        infoContent.appendChild(p);
      });
    }
  }

  // Adds a standard button to the right-bar
  addButton(
    text: string,
    onClick: () => void,
    buttonClass = "right-bar-button",
    toggleSelected = false,
  ) {
    const infoContent = document.getElementById("info-content");
    if (infoContent) {
      const button = document.createElement("button");
      button.classList.add(...buttonClass.split(" "));
      button.textContent = text;
      button.onclick = () => {
        onClick();
        if (toggleSelected) {
          button.classList.toggle("selected-button"); // Changes color on click
        }
      };
      infoContent.appendChild(button);
    }
  }

  // Adds a select dropdown to the right-bar
  addDropdown(
    label: string,
    options: { value: string; text: string }[],
    selectId?: string,
  ) {
    const infoContent = document.getElementById("info-content");
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
    infoContent.appendChild(container);
  }
}