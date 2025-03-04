import { Graphics, Point, Ticker } from "pixi.js";
import { ViewGraph } from "./graphs/viewgraph";
import { Device } from "./devices/index"; // Import the Device class
import { deselectElement, selectElement, urManager } from "./viewportManager";
import { RightBar, StyledInfo } from "../graphics/right_bar";
import { Colors, ZIndexLevels } from "../utils";
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
  currPackets: Map<string, {packet: Packet, progress: number}> = new Map<string, {packet: Packet, progress: number}>();

  static generateConnectionKey(connectedNodes: EdgeEdges): string {
    const { n1, n2 } = connectedNodes;
    return [n1, n2].sort().join(",");
  }

  constructor(
    connectedNodes: EdgeEdges,
    device1: Device,
    device2: Device,
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
        const {progress} = this.currPackets.get(child.packetId);
        child.updatePosition(this.startPos, this.endPos, progress); // hay que recalcular la posicion
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
  }

  removeHighlight() {
    this.drawEdge(this.startPos, this.endPos, Colors.Lightblue);
  }

  // Method to show the Edge information
  showInfo() {
    const info = new StyledInfo("Edge Information");
    info.addField("Edge ID", Edge.generateConnectionKey(this.connectedNodes));
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
        // Obtener las tablas de enrutamiento antes de eliminar la conexión
        const routingTable1 = this.viewgraph.getRoutingTable(
          this.connectedNodes.n1,
        );
        const routingTable2 = this.viewgraph.getRoutingTable(
          this.connectedNodes.n2,
        );

        // Crear el movimiento de eliminación de la arista con la información adicional
        const move = new RemoveEdgeMove(
          this.viewgraph.getLayer(),
          this.connectedNodes,
          new Map([
            [this.connectedNodes.n1, routingTable1],
            [this.connectedNodes.n2, routingTable2],
          ]),
        );

        this.delete();
        urManager.push(move);
      },
      "right-bar-delete-button",
    );
  }

  // Method to delete the edge
  delete() {
    // Remove the edge from the viewgraph and datagraph
    const id = Edge.generateConnectionKey(this.connectedNodes);
    this.viewgraph.removeEdge(id);
    console.log(`Edge ${id} deleted.`);
    this.destroy();
  }

  destroy() {
    deselectElement();
    super.destroy();
  }

  public updatePosition(device1: Device, device2: Device) {
    const dx = device2.x - device1.x;
    const dy = device2.y - device1.y;
    const angle = Math.atan2(dy, dx);

    const offsetX1 = ((device1.width + 5) / 2) * Math.cos(angle);
    const offsetY1 = ((device1.height + 5) / 2) * Math.sin(angle);
    const offsetX2 = ((device2.width + 5) / 2) * Math.cos(angle);
    const offsetY2 = ((device2.height + 5) / 2) * Math.sin(angle);

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

  forwardPacket(packet: Packet) {
    const packetProgress = {packet, progress: 0};
    this.currPackets.set(packet.packetId, packetProgress);
    this.addChild(packet);
    packet.updatePosition(this.startPos, this.endPos, packetProgress.progress);
    Ticker.shared.add(this.animationTick.bind(this, packetProgress));
  }

  animationTick(ticker: Ticker, packetProgress: {packet: Packet, progress: number}) {
    // calcular recorrido de paquete
    // si paquete no llego al final de la arista, se termina ahi la funcion
    // se paquete llego al final de la arista:
    //   - se consigue el id del nuevo dispositivo
    //   - se llama nuevamente al packet.traversePacket
    //   - se saca el animationTick de Ticker
    const {packet, progress} = packetProgress;
    const edgeLength = Math.sqrt(
      Math.pow(this.endPos.x - this.startPos.x, 2) + Math.pow(this.endPos.y - this.startPos.y, 2),
    );

    const normalizedSpeed = 100 / edgeLength;

    if (!Packet.animationPaused) {
      const progressIncrement =
        (ticker.deltaMS * normalizedSpeed * this.viewgraph.getSpeed()) / 1000;
      const newProgress = progress + progressIncrement;
      packet.updatePosition(this.startPos, this.endPos, newProgress);
    }
  }
}
