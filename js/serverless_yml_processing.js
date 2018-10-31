"use strict";

let {GraphNode, GraphEdge, CallGraph} = require("./call_graph");






const event_label_map = Object.freeze({
    "stream": "arn",
    "http": "path",
    "s3": "bucket"
});

function event_to_node(e) {
    let type = Object.keys(e)[0];
    let isEntry = (type === "http");
    let label = e[type][event_label_map[type]];
    return new GraphNode(type, label, isEntry);
}


function config_function_to_graph(f) {
    let lambda_node = new GraphNode("lambda", f.handler, false);
    if (f.events === undefined )  { f.events=[]; }
    return f.events
        .map(event_to_node)
        .map((event_node) => ({"node": event_node, "edge": new GraphEdge(event_node, lambda_node)}))
        .reduce((g, n) => g.add_node(n.node).add_edge(n.edge), new CallGraph().add_node(lambda_node));
}

module.exports = function convert_serverless_to_graph(config) {
    if (config.functions === undefined) { config.functions=[]; }
    return Object.keys(config.functions)
        .map((f) => config.functions[f])
        .map(config_function_to_graph)
        .reduce((a, n) => a.union_graphs(n), new CallGraph());
};
