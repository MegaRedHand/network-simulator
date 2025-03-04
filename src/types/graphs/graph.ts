export type VertexId = number;

export class Graph<Vertex, Edge> {
  /**
   * Holds all of the Vertex data.
   */
  private vertices: Map<VertexId, Vertex> = new Map();
  /**
   * Represents a connection matrix, with `edges[x][y]` representing the edge between vertices `x` and `y`.
   * Note that edges are symmetrical, so `edges[x][y]` is the same as `edges[y][x]`.
   */
  private edges: Map<VertexId, Map<VertexId, Edge>> = new Map();

  hasVertex(id: VertexId): boolean {
    return this.vertices.has(id);
  }

  getVertex(id: VertexId): Vertex | undefined {
    return this.vertices.get(id);
  }

  getEdge(id: VertexId, otherId: VertexId): Edge | undefined {
    return this.edges.get(id)?.get(otherId);
  }

  getConnections(id: VertexId): VertexId[] | undefined {
    if (!this.hasVertex(id)) {
      return undefined;
    }
    return Array.from(this.edges.get(id).keys());
  }

  setVertex(id: VertexId, vertex: Vertex): void {
    this.vertices.set(id, vertex);
    this.edges.set(id, new Map());
  }

  setEdge(id: VertexId, otherId: VertexId, edge: Edge): void {
    if (!this.hasVertex(id) || !this.hasVertex(otherId)) {
      return;
    }
    this.edges.get(id).set(otherId, edge);
    this.edges.get(otherId).set(id, edge);
  }

  removeVertex(id: VertexId): void {
    if (!this.vertices.delete(id)) {
      return;
    }
    const edges = this.edges.get(id);
    this.edges.delete(id);

    edges.forEach((_, otherId) => {
      this.edges.get(otherId).delete(id);
    });
  }

  removeEdge(id: VertexId, otherId: VertexId): void {
    if (!this.hasVertex(id) || !this.hasVertex(otherId)) {
      return;
    }
    this.edges.get(id).delete(otherId);
    this.edges.get(otherId).delete(id);
  }
}
