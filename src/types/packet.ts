import * as PIXI from 'pixi.js';
import { Edge } from './edge';

export class Packet {
    sprite: PIXI.Graphics; // Representación del paquete (ahora un círculo)
    speed: number;

    constructor(color: number, speed: number) {
        this.sprite = new PIXI.Graphics();
        this.sprite.beginFill(color);
        this.sprite.drawCircle(0, 0, 5); // Cambiar a un círculo con radio de 5
        this.sprite.endFill();
        this.speed = speed;
    }
    
    animateAlongEdge(edge: Edge, destinationId: number): void {
        // Establecer la posición inicial del paquete al inicio de la arista
        if (destinationId === edge.connectedNodes.n2) {
            this.sprite.position.set(edge.startPos.x, edge.startPos.y);
        } else {
            this.sprite.position.set(edge.endPos.x, edge.endPos.y);
        }
    
        // Configurar un ticker para la animación
        const ticker = new PIXI.Ticker();
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
    
            // Calcular la distancia y dirección
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
    
            // Normalizar la dirección
            const directionX = dx / distance;
            const directionY = dy / distance;
    
            // Actualizar la posición del paquete basada en la velocidad
            const delta = ticker.deltaMS / 1000;
    
            // Mover el paquete
            this.sprite.x += directionX * this.speed * delta;
            this.sprite.y += directionY * this.speed * delta;
    
            // Comprobar si el paquete ha llegado al punto final
            if (Math.abs(this.sprite.x - end.x) < Math.abs(directionX * this.speed * delta) &&
                Math.abs(this.sprite.y - end.y) < Math.abs(directionY * this.speed * delta)) {
                this.sprite.position.set(end.x, end.y); // Ajustar a la posición final
                this.sprite.visible = false; // Ocultar el sprite al llegar al destino
                ticker.stop(); // Detener el ticker una vez que el paquete llega
                ticker.destroy(); // Limpiar el ticker
            }
        });
        ticker.start();
    }
    
}
