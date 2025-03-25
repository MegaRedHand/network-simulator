import { Renderable } from "../right_bar";
import {
  tooltipsDictionary,
  showTooltip,
  hideTooltip,
} from "./tooltip_manager";

export interface Field {
  label: string;
  value: string;
  tooltip?: string;
}

export class StyledInfo implements Renderable {
  title: string;
  titleTooltip?: string;
  info: Field[] = [];

  constructor(title: string) {
    this.title = title;
    this.titleTooltip = tooltipsDictionary[title] || "";
  }

  // Clears previous calls to addX methods
  clear() {
    this.info = [];
    return this;
  }

  // Adds a new field to show on the info list
  addField(label: string, value: string, tooltip?: string) {
    const resolvedTooltip = tooltip || tooltipsDictionary[label] || "";
    this.info.push({ label, value, tooltip: resolvedTooltip });
  }

  // Adds a new field to show on the info list, which has a list of values
  addListField(label: string, values: number[], tooltip?: string) {
    const value = values.length !== 0 ? "[" + values.join(", ") + "]" : "None";
    const resolvedTooltip = tooltip || tooltipsDictionary[label] || "";
    this.info.push({ label, value, tooltip: resolvedTooltip });
  }

  toHTML() {
    const childNodes: Node[] = [];
    const header = document.createElement("h3");
    header.textContent = this.title;

    if (this.titleTooltip) {
      header.addEventListener("mouseenter", () =>
        showTooltip(this.titleTooltip),
      );
      header.addEventListener("mouseleave", () => hideTooltip());
      header.classList.add("has-tooltip");
    }

    childNodes.push(header);

    this.info.forEach((item) => {
      const p = document.createElement("p");
      p.innerHTML = `<strong>${item.label}:</strong> ${item.value}`;

      if (item.tooltip) {
        p.addEventListener("mouseenter", () => showTooltip(item.tooltip));
        p.addEventListener("mouseleave", () => hideTooltip());
        p.classList.add("has-tooltip");
      }

      childNodes.push(p);
    });
    return childNodes;
  }
}
