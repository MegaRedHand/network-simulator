export interface Renderable {
  toHTML(): Node[];
}

import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { TextInfo } from "../basic_components/text_info";

export abstract class BaseInfo implements Renderable {
  protected information: TextInfo;
  protected inputFields: Node[] = [];

  constructor(title: string) {
    this.information = new TextInfo(title);
    this.addCommonButtons();
    this.addDivider();
  }

  protected abstract addCommonInfoFields(): void;

  protected abstract addCommonButtons(): void;

  addField(name: string, value: string): void {
    this.information.addField(name, value);
  }
  addListField(name: string, values: number[]): void {
    this.information.addListField(name, values);
  }

  addEmptySpace(): void {
    this.inputFields.push(document.createElement("br"));
  }

  addDivider(): void {
    const divider = document.createElement("div");
    divider.classList.add(CSS_CLASSES.DIVIDER);
    this.inputFields.push(divider);
  }

  // Método para convertir la información a HTML
  toHTML(): Node[] {
    return [this.information.render(), ...this.inputFields];
  }
}
