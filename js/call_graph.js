

module.exports = {
"GraphNode": class GraphNode {

    constructor(type, label, entry, group) {
        this.type = type;
        this.label = label;
        this.isEntry = entry;
        this.group = group || this;
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
      if (CallGraph.instance) return CallGraph.instance;

      this.nodes = new Set();
      this.edges = new Set();
      CallGraph.instance = this;
  }

  union_graphs(b) {
      //NOTE: now that this is a singleton, this is a null-op
      //this.nodes = [...b.nodes].reduce((a, n) => a.add(n), this.nodes);
      //this.edges = [...b.edges].reduce((a, n) => a.add(n), this.edges);
      return this;
  }

  set_context_on_nodes(ctx) {
      [...this.nodes].forEach((n) => n.set_context(ctx));
      return this;
  }

  add_node(n) {
      if (![...this.nodes].some((x) => x.valueOf === n.valueOf)) {
               this.nodes = this.nodes.add(n);
     }
      return this;
  }

  add_edge(e) {
      if (![...this.edges].some((x) => x.valueOf === e.valueOf)) {
               this.edges = this.edges.add(e);
     }
      return this;
  }
},


};
