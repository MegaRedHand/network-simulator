import { updateTooltipsState } from "../../graphics/renderables/tooltip_manager";
import { SwitchSetting } from "./switch";

export const CONFIG_SWITCH_KEYS = {
  ENABLE_TOOLTIPS: "enableTooltips",
  USE_TCP_RENO: "useTcpReno",
} as const;

export function createAllSwitches(): SwitchSetting[] {
  return [
    new SwitchSetting(
      CONFIG_SWITCH_KEYS.ENABLE_TOOLTIPS,
      "Enable Tooltips",
      true,
      () => updateTooltipsState(),
    ),
    new SwitchSetting(CONFIG_SWITCH_KEYS.USE_TCP_RENO, "Use TCP Reno", true),
  ];
}
