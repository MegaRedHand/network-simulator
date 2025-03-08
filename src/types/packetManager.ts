import { Packet } from "./packet";
import { DeviceId } from "./graphs/datagraph";
import { Edge } from "./edge";
import { ViewGraph } from "./graphs/viewgraph";

export class PacketManager {
    private viewGraph: ViewGraph;
    
    constructor(viewGraph: ViewGraph) {
        this.viewGraph = viewGraph;
    }

    getCurrPackets(): Set<Packet> {
        const allPackets = new Set<Packet>();
        
        this.viewGraph.getEdges().forEach((edge) => {
            const edgePackets = edge.getPackets();
            console.log(`[PACKETS] Edge ${edge.connectedNodes} packets: ${edgePackets}`);
            edgePackets.forEach((packet) => allPackets.add(packet));
        });
        
        console.log(`[PACKETS] All packets: ${allPackets.size}`);
        return allPackets;
    }

    getPacketsRoutes(currPackets: Set<Packet>): Map<Packet, DeviceId[]> {
        const packetRoutes = new Map<Packet, DeviceId[]>();
        currPackets.forEach((packet) => {
            const route = this.viewGraph.getPathBetween(packet.srcId, packet.dstId);
            packetRoutes.set(packet, route);
        });

        return packetRoutes;
    }

    addPackets(packetRoutes: Map<Packet, DeviceId[]>) {
        const packets = new Set<Packet>();

        packetRoutes.forEach((route, packet) => {
            packets.add(packet);
        });

        const newPacketRoutes = this.getPacketsRoutes(packets);

        packetRoutes.forEach((route, packet) => {
            const newRoute = newPacketRoutes.get(packet);
            console.log(`[ROUTES] Packet ${packet} route: ${route} new route: ${newRoute}`);
            console.log(`[ROUTE] Current Edge ${packet.currentEdge.connectedNodes.n1}-${packet.currentEdge.connectedNodes.n2}`);

            // TODO: Calcular la cantidad de saltos para poder mantener mejor el progreso del paquete
            const n1 = newRoute[0];
            const n2 = newRoute[1];

            const edgeId = Edge.generateConnectionKey({ n1, n2 });
            const edge = this.viewGraph.getEdge(edgeId);

            if (edge) {
                edge.registerPacket(packet);
                packet.traverseEdge(edge, packet.srcId);
            }
        });
    }
}