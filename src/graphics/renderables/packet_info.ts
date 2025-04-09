import { Packet } from "../../types/packet";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { Button } from "../basic_components/button";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { BaseInfo } from "./base_info";
import { ToggleInfo } from "../components/toggle_info";

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

  protected addCommonButtons(): void {
    // Botón para descartar el paquete
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

    // Agregar el botón al array de inputFields
    this.inputFields.push(discardPacketButton.toHTML());
  }

  private addToggleInfo(): void {
    // Obtener los detalles del paquete
    const packetDetails = this.packet.getPacketDetails(
      this.packet.belongingLayer,
      this.packet.rawPacket,
    );

    // Crear un ToggleInfo para los detalles del paquete
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

    // Agregar el ToggleInfo al array de inputFields
    this.inputFields.push(toggleInfo.toHTML());
  }
}
