import { NetworkGraph } from "./networkgraph";
import { Graphics, Sprite, Texture } from "pixi.js";
import { GlobalContext } from "./../index";
import { Device, Pc, Router, Server } from "./device";

// Función para agregar un router en el centro del viewport
export function AddRouter(ctx: GlobalContext) {
  let networkGraph = ctx.getNetwork();

  const newRouter: Device = new Router(networkGraph);

  // Agregar el RouterNode al grafo
  networkGraph.addDevice(newRouter);

  console.log(
    `Router añadido con ID ${newRouter.id} en el centro de la pantalla.`
  );
}

// Función para agregar un PC en el centro del viewport
export function AddPc(ctx: GlobalContext) {
  let networkGraph = ctx.getNetwork();

  const newPC: Device = new Pc(networkGraph);

  // Agregar el PCNode al grafo
  networkGraph.addDevice(newPC);

  console.log(`PC añadido con ID ${newPC.id} en el centro de la pantalla.`);
}

// Función para agregar un server en el centro del viewport (suponiendo que existe un tipo ServerNode)
export function AddServer(ctx: GlobalContext) {
  let networkGraph = ctx.getNetwork();

  const newServer: Device = new Server(networkGraph);

  // Agregar el ServerNode al grafo
  networkGraph.addDevice(newServer);

  console.log(
    `Server añadido con ID ${newServer.id} en el centro de la pantalla.`
  );
}
