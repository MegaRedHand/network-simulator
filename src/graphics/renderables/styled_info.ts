import { Renderable } from "../right_bar";

export interface Field {
  label: string;
  value: string;
}

export class StyledInfo implements Renderable {
  title: string;
  info: Field[] = [];

  constructor(title: string) {
    this.title = title;
  }

  // Clears previous calls to addX methods
  clear() {
    this.info = [];
    return this;
  }

  // Adds a new field to show on the info list
  addField(label: string, value: string) {
    this.info.push({ label, value });
  }

  // Adds a new field to show on the info list, which has a list of values
  addListField(label: string, values: number[]) {
    const value = values.length !== 0 ? "[" + values.join(", ") + "]" : "None";
    this.info.push({ label, value });
  }

  // Returns a list of HTML nodes with the info to show
  toHTML() {
    const childNodes: Node[] = [];
    const header = document.createElement("h3");
    header.textContent = this.title;
    childNodes.push(header);

    this.info.forEach((item) => {
      const p = document.createElement("p");
      p.innerHTML = `<strong>${item.label}:</strong> ${item.value}`;
      childNodes.push(p);
    });
    return childNodes;
  }
}
