import { updateTooltipsState } from "../../graphics/renderables/tooltip_manager";
import { SwitchSetting } from "./switch";

export class EnableTooltipsSwitch extends SwitchSetting {
  constructor() {
    super("enableTooltips", "Enable Tooltips", true);
  }
  apply() {
    updateTooltipsState();
  }
}
