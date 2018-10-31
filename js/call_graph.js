

module.exports = {
"GraphNode": class GraphNode {

    constructor(type, label, entry) {
        this.type = type;
        this.label = label;
        this.isEntry = entry;
    }

    set_context(context) {
        this.context = context;
        return this;
    }

    valueOf() {
        return this.type + ",,," + this.label + ",,," + this.isEntry;
    }
},


"GraphEdge": class GraphEdge {
    constructor(from, to) {
        this.from = from;
        this.to = to;
    }

    valueOf() {
        return this.from.valueOf() + "|||" + this.to.valueOf();
    }
},

"CallGraph": class CallGraph {
  constructor() {
      this.nodes = new Set();
      this.edges = new Set();
  }

  union_graphs(b) {
      this.nodes = [...b.nodes].reduce((a, n) => a.add(n), this.nodes);
      this.edges = [...b.edges].reduce((a, n) => a.add(n), this.edges);

      return this;
  }

  set_context_on_nodes(ctx) {
      [...this.nodes].forEach((n) => n.set_context(ctx));
      return this;
  }

  add_node(n) {
      if (this.nodes.some((x) => x.valueOf == n.valueOf)) {
               this.nodes = this.nodes.add(n);
     }
      return this;
  }

  add_edge(e) {
      if (this.nodes.some((x) => x.valueOf == e.valueOf)) {
               this.edges = this.edges.add(e);
     }
      return this;
  }
},


};
