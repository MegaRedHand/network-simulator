import { Graphics, Ticker } from "pixi.js";
import { Edge, Position } from "./edge";

export class Packet extends Graphics {
  speed: number;
  progress = 0;

  constructor(color: number, speed: number) {
    super();
    this.beginFill(color);
    this.drawCircle(0, 0, 5); // Cambiar a un círculo con radio de 5
    this.endFill();
    this.speed = speed;
  }

  animateAlongPath(path: Edge[], start: number): void {
    const ticker = Ticker.shared;
    let currentEdge = path[0];
    // let startPos = currentEdge.nodePosition(start);
    // this.position.set(startPos.x, startPos.y);
    // ticker.add(() => {});
    this.animateAlongEdge(currentEdge, currentEdge.otherEnd(start));
  }

  animateAlongEdge(edge: Edge, destinationId: number): void {
    // Establecer la posición inicial del paquete al inicio de la arista
    if (destinationId === edge.connectedNodes.n2) {
      this.position.set(edge.startPos.x, edge.startPos.y);
    } else {
      this.position.set(edge.endPos.x, edge.endPos.y);
    }

    // Configurar un ticker para la animación
    const ticker = new Ticker();
    ticker.add(() => {
      let start;
      let end;

      // Obtener posiciones de inicio y fin de la arista
      if (destinationId === edge.connectedNodes.n2) {
        start = edge.startPos;
        end = edge.endPos;
      } else {
        start = edge.endPos;
        end = edge.startPos;
      }

      this.progress += (ticker.deltaMS * this.speed) / 100000;

      this.setPositionAlongEdge(start, end, this.progress);

      if (this.progress >= 1) {
        this.position.set(end.x, end.y); // Ajustar a la posición final
        this.visible = false; // Ocultar el sprite al llegar al destino
        ticker.stop(); // Detener el ticker una vez que el paquete llega
        ticker.destroy(); // Limpiar el ticker
      }
    });
    ticker.start();
  }

  /// Updates the position according to the current progress.
  /// Returns `true` if the packet has reached the destination or `false` otherwise.
  setPositionAlongEdge(start: Position, end: Position, progress: number) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Mover el paquete
    this.x = start.x + progress * dx;
    this.y = start.y + progress * dy;
  }
}
