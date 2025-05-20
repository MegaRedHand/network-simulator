import { GlobalContext } from "../../context";
import { SwitchSetting } from "./switch";

export class UseTcpRenoSwitch extends SwitchSetting {
  constructor(ctx: GlobalContext) {
    super(ctx, "useTcpReno", "Use TCP Reno", true);
  }
  apply() {
    this.ctx.setUseTcpReno(this.value);
  }
}
