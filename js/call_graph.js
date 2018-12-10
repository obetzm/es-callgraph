

module.exports = {
"GraphNode": class GraphNode {

    constructor(type, label, entry, group, rep) {
        this.type = type;
        this.label = label;
        this.isEntry = entry;
        this.group = group || label;
        this.rep = rep;
    }

    set_context(context, file) {
        this.context = context;
        this.file = file + ".js";
        return this;
    }

    get value() {
        return this.type + ",,," + + this.file + "." + this.label;
    }
},


"GraphEdge": class GraphEdge {
    constructor(from, to) {
        this.from = from;
        this.to = to;
    }

    get value() {
        return this.from.value + "|||" + this.to.value;
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
      if (![...this.nodes].some((x) => x.value === n.value)) {

               this.nodes = this.nodes.add(n);
     }
      return this;
  }

  merge_nodes(a,b) {//needed because of aliasing in module.exports
      [...this.edges].filter((e) => e.from === b).forEach((e) => e.from = a);
      [...this.edges].filter((e) => e.to === b).forEach((e) => e.to = a);
      this.nodes.delete(b);

  }

  add_edge(e) {
      if (![...this.edges].some((x) => x.value === e.value)) {
          this.edges = this.edges.add(e);
     }
      return this;
  }

  get_external_node(type, identifier) { //TODO: cache these for faster lookup
      return [...this.nodes].filter((n) => n.type === type && n.label.includes(identifier));
  }
},


};
