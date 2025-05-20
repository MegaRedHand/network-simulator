import { SwitchSetting } from "./switch";

export class UseTcpRenoSwitch extends SwitchSetting {
  constructor() {
    super("useTcpReno", "Use TCP Reno", true);
  }
  apply() {
    console.log("TCP Reno setting applied:", this.value);
  }
}
