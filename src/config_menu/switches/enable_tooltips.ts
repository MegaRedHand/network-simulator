import { GlobalContext } from "../../context";
import { updateTooltipsState } from "../../graphics/renderables/tooltip_manager";
import { SwitchSetting } from "./switch";

export class EnableTooltipsSwitch extends SwitchSetting {
  constructor(ctx: GlobalContext) {
    super(ctx, "enableTooltips", "Enable Tooltips", true);
  }
  apply() {
    this.ctx.setEnableTooltips(this.value);
    updateTooltipsState();
  }
}
