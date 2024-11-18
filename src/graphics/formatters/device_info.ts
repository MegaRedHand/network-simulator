import { StyledInfo } from "./styled_info";

export class DeviceInfo extends StyledInfo {
  constructor(typeName: string) {
    super(typeName + " Information");
  }
}
