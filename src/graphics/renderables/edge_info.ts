import { Edge } from "../../types/edge";
import { RemoveEdgeMove } from "../../types/undo-redo";
import { urManager } from "../../types/viewportManager";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { Button } from "../basic_components/button";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { BaseInfo } from "./base_info";

export class EdgeInfo extends BaseInfo {
  readonly edge: Edge;

  constructor(edge: Edge) {
    super("Edge Information");
    this.edge = edge;
    this.addCommonInfoFields();
  }

  protected addCommonInfoFields(): void {
    const from = this.edge.data.from.id;
    const to = this.edge.data.to.id;

    // Obtiene los dispositivos conectados
    const fromDevice = this.edge.viewgraph.getDataGraph().getDevice(from);
    const toDevice = this.edge.viewgraph.getDataGraph().getDevice(to);

    if (!fromDevice || !toDevice) {
      console.error("One of the devices is not found in the viewgraph.");
      return;
    }

    // Obtiene las interfaces conectadas
    const fromInterface = fromDevice.interfaces[this.edge.data.from.iface];
    const toInterface = toDevice.interfaces[this.edge.data.to.iface];

    if (!fromInterface || !toInterface) {
      console.error("One of the interfaces is not found.");
      return;
    }

    // Añade la información básica sobre la arista
    this.information.addField(
      "Connected Devices",
      `${from} ↔️ ${to}`,
      TOOLTIP_KEYS.EDGE_CONNECTED_DEVICES,
    );
    this.information.addField(
      "Connected Interfaces",
      `${fromInterface.name} ↔️ ${toInterface.name}`,
      TOOLTIP_KEYS.EDGE_CONNECTED_INTERFACES,
    );
    // Añade las direcciones MAC como campos separados
    this.information.addField(
      `MAC Address iface (Device ${from})`,
      fromInterface.mac.octets.join(":"),
      TOOLTIP_KEYS.MAC_ADDRESS_IFACE,
    );
    this.information.addField(
      `MAC Address iface (Device ${to})`,
      toInterface.mac.octets.join(":"),
      TOOLTIP_KEYS.MAC_ADDRESS_IFACE,
    );
  }

  protected addCommonButtons(): void {
    // Botón para eliminar la arista
    const deleteEdgeButton = new Button({
      text: TOOLTIP_KEYS.DELETE_EDGE_BUTTON,
      onClick: () => {
        const viewgraph = this.edge.viewgraph;
        const from = this.edge.data.from.id;
        const to = this.edge.data.to.id;
        const move = new RemoveEdgeMove(viewgraph.getLayer(), from, to);

        urManager.push(viewgraph, move);
      },
      classList: [
        CSS_CLASSES.RIGHT_BAR_BUTTON,
        CSS_CLASSES.RIGHT_BAR_DELETE_BUTTON,
      ],
      tooltip: TOOLTIP_KEYS.DELETE_EDGE_BUTTON,
    });

    // Agregar el botón al array de inputFields
    this.inputFields.push(deleteEdgeButton.render());
  }
}
