import { GlobalContext } from "../../context";
import { EnableTooltipsSwitch } from "./enable_tooltips";
import { SwitchSetting } from "./switch";
import { UseTcpRenoSwitch } from "./tcp_reno";

export function createAllSwitches(ctx: GlobalContext): SwitchSetting[] {
  return [new EnableTooltipsSwitch(ctx), new UseTcpRenoSwitch(ctx)];
}
