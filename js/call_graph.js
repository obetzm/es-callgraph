class GraphNode {

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
        return this.type + ",,," + this.context + "." + this.file + "." + this.label;
    }
}

class CallGraph {
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

    get_external_node(type, identifier) { //TODO: cache these for faster lookup?
        return [...this.nodes].filter((n) => n.type === type && n.label.includes(identifier));
    }

    find_or_create_dynamo_node(identifier) {
        let dynamo_node = this.get_external_node("stream", identifier);
        if (dynamo_node.length === 0) {
            dynamo_node = new GraphNode("stream", `aws:dynamodb:us-east-1:xxxxxx:table/${identifier}`, false);
            CallGraph.instance.add_node(dynamo_node);
        } else dynamo_node = dynamo_node[0];
        return dynamo_node;
    }
}

module.exports = {
"GraphNode": GraphNode,


"GraphEdge": class GraphEdge {
    constructor(from, to, type) {
        this.from = from;
        this.to = to;
        this.type = type;
    }

    get value() {
        return this.from.value + "|||" + this.to.value;
    }
},

"CallGraph": CallGraph,


};
