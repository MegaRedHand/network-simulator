import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { IpAddress } from "../../packets/ip";
import {
  createEditableText,
  DeviceInfo,
  RightBar,
} from "../../graphics/right_bar";
import { ProgramInfo } from "../../graphics/renderables/device_info";

export class Host extends Device {
  constructor(
    id: number,
    viewgraph: ViewGraph,
    position: Position,
    ip: IpAddress,
    mask: IpAddress,
  ) {
    super(id, PcImage, viewgraph, position, ip, mask);
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addField("IP Address", this.ip.octets.join("."));
    info.addSendPacketButton();
    const programList: ProgramInfo[] = [
      {
        name: "<select a program>",
        start: () => undefined,
      },
      {
        name: "Send ICMP echo",
        inputs: [createEditableText("Destination IP")],
        start: () => console.log("Send ICMP echo started"),
      },
      {
        name: "Echo server",
        inputs: [createEditableText("Destination IP")],
        start: () => console.log("Echo server started"),
      },
    ];
    info.addProgramList(programList);
    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.App;
  }

  getType(): DeviceType {
    return DeviceType.Host;
  }
}
