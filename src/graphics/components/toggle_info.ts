import { InfoField, TextInfo } from "../basic_components/text_info";
import { ToggleButton } from "../basic_components/toggle_button";

export interface ToggleInfoProps {
  title: string; // Título del elemento TextInfo
  fields: InfoField[]; // Campos para TextInfo
  toggleButtonText: { on: string; off: string }; // Textos para el botón toggle
}

export class ToggleInfo {
  private container: HTMLElement;
  private textInfo: TextInfo;
  private toggleButton: ToggleButton;

  constructor(private props: ToggleInfoProps) {
    this.container = document.createElement("div");
    this.container.classList.add("toggle-info-container");

    // Crear el elemento TextInfo
    this.textInfo = new TextInfo();
    this.props.fields.forEach((field) => {
      this.textInfo.addField(field.key, field.value, field.tooltip);
    });

    // Crear el botón toggle
    this.toggleButton = new ToggleButton({
      text: this.props.toggleButtonText.off,
      textOn: this.props.toggleButtonText.on,
      textOff: this.props.toggleButtonText.off,
      className: "right-bar-toggle-button",
      onToggle: (isToggled) => {
        this.textInfo.toHTML().style.display = isToggled ? "block" : "none";
      },
    });

    this.initialize();
  }

  private initialize(): void {
    // Renderizar el botón toggle
    const toggleButtonElement = this.toggleButton.toHTML();

    // Renderizar el TextInfo (oculto inicialmente)
    const textInfoElement = this.textInfo.toHTML();
    textInfoElement.style.display = "none"; // Ocultar inicialmente

    // Agregar los elementos al contenedor principal
    this.container.appendChild(toggleButtonElement);
    this.container.appendChild(textInfoElement);
  }

  toHTML(): HTMLElement {
    return this.container;
  }
}
