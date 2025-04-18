import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { attachTooltip } from "../renderables/tooltip_manager";

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

    if (typeof value === "object" && value !== null) {
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
}
