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
    const { n1, n2 } = this.edge.connectedNodes;

    // Agregar información básica de la arista
    this.information.addField(TOOLTIP_KEYS.CONNECTION, `${n1} <=> ${n2}`);
  }

  protected addCommonButtons(): void {
    // Botón para eliminar la arista
    const deleteEdgeButton = new Button({
      text: TOOLTIP_KEYS.DELETE_EDGE_BUTTON,
      onClick: () => {
        const viewgraph = this.edge.viewgraph;

        // Obtener las tablas de enrutamiento antes de eliminar la conexión
        const routingTable1 = viewgraph.getRoutingTable(
          this.edge.connectedNodes.n1,
        );
        const routingTable2 = viewgraph.getRoutingTable(
          this.edge.connectedNodes.n2,
        );

        // Crear el movimiento de eliminación de la arista con la información adicional
        const routingTables = new Map([
          [this.edge.connectedNodes.n1, routingTable1],
          [this.edge.connectedNodes.n2, routingTable2],
        ]);
        const move = new RemoveEdgeMove(
          viewgraph.getLayer(),
          this.edge.connectedNodes,
          routingTables,
        );

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
