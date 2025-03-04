export type VertexId = number;

export class Graph<Vertex, Edge> {
  /**
   * Holds all of the Vertex data.
   */
  private vertices = new Map<VertexId, Vertex>();
  /**
   * Represents a connection matrix, with `edges[x][y]` representing the edge between vertices `x` and `y`.
   * Note that edges are symmetrical, so `edges[x][y]` is the same as `edges[y][x]`.
   */
  private edges = new Map<VertexId, Map<VertexId, Edge>>();

  hasVertex(id: VertexId): boolean {
    return this.vertices.has(id);
  }

  hasEdge(id: VertexId, otherId: VertexId): boolean {
    return this.edges.has(id) && this.edges.get(id).has(otherId);
  }

  getVertex(id: VertexId): Vertex | undefined {
    return this.vertices.get(id);
  }

  getEdge(id: VertexId, otherId: VertexId): Edge | undefined {
    return this.edges.get(id)?.get(otherId);
  }

  getNeighbors(id: VertexId): VertexId[] | undefined {
    if (!this.hasVertex(id)) {
      return undefined;
    }
    return Array.from(this.edges.get(id).keys());
  }

  getVertices(): IterableIterator<[VertexId, Vertex]> {
    return this.vertices.entries();
  }

  getVertexCount(): number {
    return this.vertices.size;
  }

  /**
   * Returns an iterator over all edges in the graph.
   * @returns an iterator over all edges in the graph, with no duplicates.
   */
  getEdges(): IterableIterator<[VertexId, VertexId, Edge]> {
    return edgeIterator(this.edges);
  }

  setVertex(id: VertexId, vertex: Vertex): void {
    this.vertices.set(id, vertex);
    if (!this.edges.has(id)) {
      this.edges.set(id, new Map());
    }
  }

  setEdge(id: VertexId, otherId: VertexId, edge: Edge = null): void {
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

function* edgeIterator<Edge>(
  edges: Map<VertexId, Map<VertexId, Edge>>,
): IterableIterator<[VertexId, VertexId, Edge]> {
  for (const [id, nodeEdges] of edges) {
    for (const [otherId, edge] of nodeEdges) {
      yield [id, otherId, edge];
    }
  }
}
