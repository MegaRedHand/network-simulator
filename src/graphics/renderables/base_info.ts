import { TextInfo } from "../basic_components/text_info";

export abstract class BaseInfo {
  protected information: TextInfo;
  protected inputFields: Node[] = [];

  constructor(title: string) {
    this.information = new TextInfo(title);
    this.addCommonButtons();
  }

  protected abstract addCommonInfoFields(): void;

  protected abstract addCommonButtons(): void;

  addField(name: string, value: string): void {
    this.information.addField(name, value);
  }
  addListField(name: string, values: number[]): void {
    this.information.addListField(name, values);
  }

  // Método para convertir la información a HTML
  toHTML(): Node[] {
    return [this.information.render(), ...this.inputFields];
  }
}
