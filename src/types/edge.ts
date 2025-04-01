import { Graphics, Point } from "pixi.js";
import { ViewGraph } from "./graphs/viewgraph";
import { ViewDevice } from "./view-devices/index"; // Import the Device class
import { deselectElement, selectElement, urManager } from "./viewportManager";
import { RightBar, StyledInfo } from "../graphics/right_bar";
import { Colors, ZIndexLevels } from "../utils/utils";
import { Packet } from "./packet";
import { RemoveEdgeMove } from "./undo-redo";
import { DeviceId } from "./graphs/datagraph";

export interface EdgeEdges {
  n1: DeviceId;
  n2: DeviceId;
}

export class Edge extends Graphics {
  connectedNodes: EdgeEdges;
  startPos: Point;
  endPos: Point;
  viewgraph: ViewGraph;
  rightbar: RightBar;

  constructor(
    connectedNodes: EdgeEdges,
    device1: ViewDevice,
    device2: ViewDevice,
    viewgraph: ViewGraph,
  ) {
    super();
    this.connectedNodes = connectedNodes;
    this.viewgraph = viewgraph;
    this.rightbar = RightBar.getInstance();

    this.updatePosition(device1, device2);

    this.eventMode = "static";
    this.interactive = true;
    this.cursor = "pointer";
    this.on("click", () => selectElement(this));
    // NOTE: this is "click" for mobile devices
    this.on("tap", () => selectElement(this));
  }

  nodePosition(nodeId: DeviceId): Point | undefined {
    return this.connectedNodes.n1 === nodeId
      ? this.startPos
      : this.connectedNodes.n2 === nodeId
        ? this.endPos
        : undefined;
  }

  otherEnd(nodeId: DeviceId): DeviceId | undefined {
    return this.connectedNodes.n1 === nodeId
      ? this.connectedNodes.n2
      : this.connectedNodes.n2 === nodeId
        ? this.connectedNodes.n1
        : undefined;
  }

  // Method to draw the line
  public drawEdge(startPos: Point, endPos: Point, color: number) {
    this.clear();
    this.moveTo(startPos.x, startPos.y);
    this.lineTo(endPos.x, endPos.y);
    this.stroke({ width: 3, color });
    this.zIndex = ZIndexLevels.Edge;
    this.startPos = startPos;
    this.endPos = endPos;

    this.children.forEach((child) => {
      if (child instanceof Packet) {
        child.updatePosition();
      }
    });
  }

  select() {
    this.highlight();
    this.showInfo();
  }

  deselect() {
    // TODO
    console.log("deselected");
    this.removeHighlight();
  }

  highlight() {
    this.drawEdge(this.startPos, this.endPos, Colors.Violet);
    this.viewgraph.transparentEdgesForEdge(
      this.connectedNodes.n1,
      this.connectedNodes.n2,
    );
  }

  removeHighlight() {
    this.drawEdge(this.startPos, this.endPos, Colors.Lightblue);
    this.viewgraph.untransparentEdges();
  }

  // Method to show the Edge information
  showInfo() {
    const info = new StyledInfo("Edge Information");
    info.addField(
      "Connected Devices",
      `${this.connectedNodes.n1} <=> ${this.connectedNodes.n2}`,
    );
    info.addField(
      "Start Position",
      `x=${this.startPos.x.toFixed(2)}, y=${this.startPos.y.toFixed(2)}`,
    );
    info.addField(
      "End Position",
      `x=${this.endPos.x.toFixed(2)}, y=${this.endPos.y.toFixed(2)}`,
    );

    // Calls renderInfo to display Edge information
    this.rightbar.renderInfo(info);

    this.rightbar.addButton(
      "Delete Edge",
      () => {
        const viewgraph = this.viewgraph;
        // Obtener las tablas de enrutamiento antes de eliminar la conexión
        const routingTable1 = viewgraph.getRoutingTable(this.connectedNodes.n1);
        const routingTable2 = viewgraph.getRoutingTable(this.connectedNodes.n2);

        // Crear el movimiento de eliminación de la arista con la información adicional
        const routingTables = new Map([
          [this.connectedNodes.n1, routingTable1],
          [this.connectedNodes.n2, routingTable2],
        ]);
        const move = new RemoveEdgeMove(
          viewgraph.getLayer(),
          this.connectedNodes,
          routingTables,
        );

        urManager.push(viewgraph, move);
      },
      "right-bar-delete-button",
    );
  }

  // Method to delete the edge
  delete() {
    // Remove the edge from the viewgraph and datagraph
    const { n1, n2 } = this.connectedNodes;
    this.viewgraph.removeEdge(n1, n2);
    console.log(`Edge ${n1},${n2} deleted.`);
    this.destroy();
  }

  destroy() {
    deselectElement();
    super.destroy();
  }

  becomeTransparent() {
    this.alpha = 0.2;
  }

  becomeOpaque() {
    this.alpha = 1;
  }

  public updatePosition(device1: ViewDevice, device2: ViewDevice) {
    const dx = device2.x - device1.x;
    const dy = device2.y - device1.y;
    const angle = Math.atan2(dy, dx);

    const n1IsVisible = device1.visible;
    const n2IsVisible = device2.visible;

    const offsetX1 = n1IsVisible ? ((device1.width + 5) / 2) * Math.cos(angle) : 0;
    const offsetY1 = n1IsVisible ? ((device1.height + 5) / 2) * Math.sin(angle) : 0;
    const offsetX2 = n2IsVisible ? ((device2.width + 5) / 2) * Math.cos(angle) : 0;
    const offsetY2 = n2IsVisible ? ((device2.height + 5) / 2) * Math.sin(angle) : 0;

    const newStartPos: Point = new Point(
      device1.x + offsetX1,
      device1.y + offsetY1,
    );
    const newEndPos: Point = new Point(
      device2.x - offsetX2,
      device2.y - offsetY2,
    );

    this.drawEdge(newStartPos, newEndPos, Colors.Lightblue);
  }
}
