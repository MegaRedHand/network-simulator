import { Renderable } from "../right_bar";

export type Field = { label: string; value: string };

export class StyledInfo implements Renderable {
  title: string;
  info: Field[] = [];

  constructor(title: string) {
    this.title = title;
  }

  addField(label: string, value: string) {
    this.info.push({ label, value });
  }

  addListField(label: string, values: number[]) {
    const value = values.length !== 0 ? "[" + values.join(", ") + "]" : "None";
    this.info.push({ label, value });
  }

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
