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
import { sendPacket } from "../packet";

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
    const destinationIpContainer = createEditableText("Destination IP");
    const destinationIpInput = destinationIpContainer.querySelector("input");
    const programList: ProgramInfo[] = [
      {
        name: "<select a program>",
        start: () => undefined,
      },
      {
        name: "Send ICMP echo",
        inputs: [destinationIpContainer],
        start: () => {
          console.log("Sending ICMP echo. Address: ", destinationIpInput.value);
          const dstIp = IpAddress.parse(destinationIpInput.value);
          if (!dstIp) {
            console.error("Invalid IP address");
            return;
          }
          sendPacket(this.viewgraph, "ICMP", this.id, dstIp);
        },
      },
      {
        name: "Echo server",
        inputs: [destinationIpContainer],
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
