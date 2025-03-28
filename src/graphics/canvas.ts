import { TOOLTIP_KEYS } from "../utils/constants/tooltips_constants";
import { TooltipManager } from "./renderables/tooltip_manager";

export function createLayerSelector(
  options: { value: string; text: string }[],
  onchange: (value: string, event: Event) => void = () => undefined,
) {
  const container = document.createElement("div");
  container.classList.add("layer-selector-container");

  const dropdown = document.createElement("div");
  dropdown.classList.add("custom-dropdown", "layerselectordropdown");

  const selected = document.createElement("div");
  // Attach tooltip to the selector
  TooltipManager.getInstance().attachTooltip(
    selected,
    TOOLTIP_KEYS.LAYER_SELECTOR,
  );
  selected.classList.add("selected-option");
  selected.textContent = TOOLTIP_KEYS.LINK_LAYER;
  dropdown.appendChild(selected);

  const optionsContainer = document.createElement("div");
  optionsContainer.classList.add("options-container");

  let selectedValue: string | null = "link";

  options.forEach((optionData) => {
    const option = document.createElement("div");
    option.classList.add("dropdown-option");
    option.textContent = optionData.text;

    TooltipManager.getInstance().attachTooltip(option, optionData.text, true);

    option.onclick = (e) => {
      selected.textContent = optionData.text;
      selectedValue = optionData.value;
      optionsContainer.classList.remove("show");
      onchange(optionData.value, e);
    };

    optionsContainer.appendChild(option);
  });

  selected.onclick = (e) => {
    e.stopPropagation();
    optionsContainer.classList.toggle("show");
  };

  document.addEventListener("click", () => {
    optionsContainer.classList.remove("show");
  });

  dropdown.appendChild(optionsContainer);
  container.appendChild(dropdown);

  return {
    container,
    getValue: () => selectedValue,
    setValue: (value: string) => {
      const option = options.find((opt) => opt.value === value);
      if (option) {
        selected.textContent = option.text;
        selectedValue = option.value;
      }
    },
  };
}
