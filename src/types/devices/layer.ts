export enum Layer {
  Link = 0,
  Network = 1,
  Transport = 2,
  App = 3,
}

const layerFromNameMap: Record<string, Layer> = {
  application: Layer.App,
  transport: Layer.Transport,
  network: Layer.Network,
  link: Layer.Link,
};

const layerToNameMap = new Map([
  [Layer.App, "application"],
  [Layer.Transport, "transport"],
  [Layer.Network, "network"],
  [Layer.Link, "link"],
]);

export function layerFromName(name: string): Layer {
  return layerFromNameMap[name];
}

export function layerToName(layer: Layer): string {
  return layerToNameMap.get(layer);
}

export function layerIncluded(layer1: Layer, layer2: Layer) {
  // Determines whether layer1 is included within layer2’s abstraction.
  return layer1 >= layer2;
}
