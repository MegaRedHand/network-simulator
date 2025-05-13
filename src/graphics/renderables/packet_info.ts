import { Packet } from "../../types/packet";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { Button } from "../basic_components/button";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { BaseInfo } from "./base_info";
import { ToggleInfo } from "../components/toggle_info";
import { Layer } from "../../types/layer";
import { IPv4Packet } from "../../packets/ip";

export class PacketInfo extends BaseInfo {
  readonly packet: Packet;

  constructor(packet: Packet) {
    super("Packet Information");
    this.packet = packet;
    this.addCommonInfoFields();
    this.addToggleInfo(); // Add the toggle info for packet details
  }

  protected addCommonInfoFields(): void {
    // Información básica del paquete
    this.information.addField(
      TOOLTIP_KEYS.PACKET_TYPE,
      this.packet.type,
      TOOLTIP_KEYS.PACKET_TYPE,
    );

    const layer = this.packet.viewgraph.getLayer();
    const framePayload = this.packet.rawPacket.payload as IPv4Packet;

    if (layer == Layer.Link) {
      this.information.addField(
        TOOLTIP_KEYS.SOURCE_MAC_ADDRESS,
        this.packet.rawPacket.source.toString(),
        TOOLTIP_KEYS.SOURCE_MAC_ADDRESS,
      );
      this.information.addField(
        TOOLTIP_KEYS.DESTINATION_MAC_ADDRESS,
        this.packet.rawPacket.destination.toString(),
        TOOLTIP_KEYS.DESTINATION_MAC_ADDRESS,
      );
    }

    if (layer >= Layer.Network) {
      this.information.addField(
        TOOLTIP_KEYS.SOURCE_IP_ADDRESS,
        framePayload.sourceAddress.toString(),
        TOOLTIP_KEYS.SOURCE_IP_ADDRESS,
      );
      this.information.addField(
        TOOLTIP_KEYS.DESTINATION_IP_ADDRESS,
        framePayload.destinationAddress.toString(),
        TOOLTIP_KEYS.DESTINATION_IP_ADDRESS,
      );
    }

    if (layer >= Layer.Transport) {
      const ports = framePayload.payload.getPorts();
      if (ports) {
        this.information.addField(
          TOOLTIP_KEYS.SOURCE_PORT,
          ports.sourcePort,
          TOOLTIP_KEYS.SOURCE_PORT,
        );
        this.information.addField(
          TOOLTIP_KEYS.DESTINATION_PORT,
          ports.destinationPort,
          TOOLTIP_KEYS.DESTINATION_PORT,
        );
      }
    }
  }

  protected addCommonButtons(): void {
    this.addDivider();
    const discardPacketButton = new Button({
      text: TOOLTIP_KEYS.DISCARD_PACKET_BUTTON,
      onClick: () => {
        this.packet.delete();
        console.log(`Packet discarded: ${this.packet}`);
      },
      classList: [
        CSS_CLASSES.RIGHT_BAR_BUTTON,
        CSS_CLASSES.RIGHT_BAR_DELETE_BUTTON,
      ],
      tooltip: TOOLTIP_KEYS.DISCARD_PACKET_BUTTON,
    });

    this.inputFields.push(discardPacketButton.toHTML());
    this.addDivider();
  }

  private addToggleInfo(): void {
    const packetDetails = this.packet.getPacketDetails(
      this.packet.viewgraph.getLayer(),
      this.packet.rawPacket,
    );

    const toggleInfo = new ToggleInfo({
      title: "Packet Details",
      fields: Object.entries(packetDetails).map(([key, value]) => ({
        key: key,
        value: value,
      })),
      toggleButtonText: {
        on: "Hide Packet Details",
        off: "Show Packet Details",
      },
    });

    this.inputFields.push(toggleInfo.toHTML());
  }
}
