import { EnableTooltipsSwitch } from "./enable_tooltips";
import { SwitchSetting } from "./switch";
import { UseTcpRenoSwitch } from "./tcp_reno";

export function createAllSwitches(): SwitchSetting[] {
  return [new EnableTooltipsSwitch(), new UseTcpRenoSwitch()];
}
