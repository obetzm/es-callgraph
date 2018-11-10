"use strict";

let {GraphNode, GraphEdge, CallGraph} = require("./call_graph");
let yaml = require("js-yaml");
let fs = require("fs");


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


function config_function_to_graph(fn, ctx) {
    let lambda_node = new GraphNode("lambda", fn.handler, false).set_context(ctx);
    if (fn.events === undefined )  { fn.events=[]; }
    return fn.events
        .map(event_to_node)
        .map((n)=> n.set_context(ctx))
        .map((event_node) => ({"node": event_node, "edge": new GraphEdge(event_node, lambda_node)}))
        .reduce((g, n) => g.add_node(n.node).add_edge(n.edge), new CallGraph().add_node(lambda_node));
}


let process_serverless = function (config, ctx) {
    if (config.functions === undefined) {
        config.functions = [];
    }
    return Object.keys(config.functions)
        .map((f) => config.functions[f])
        .map((fn) => config_function_to_graph(fn, ctx))
        .reduce((a, n) => a.union_graphs(n), new CallGraph());
};


let load_yaml_from_filename = (filename) => [filename, yaml.safeLoad(fs.readFileSync(filename, 'utf8'))];


let find_serverless_files = (paths, known) => {
    known = known === undefined ? [] : known;
    let path_contents = paths
        .reduce((all_paths, path) => all_paths.concat(fs.readdirSync(path).map((file) => path + "/" + file)), []);

    let found_serverless = known.concat(path_contents.filter((p) => p.endsWith("serverless.yml")));
    let subdirs = path_contents.filter((p) => fs.statSync(p).isDirectory());

    if (subdirs.length === 0)
        return found_serverless;
    return find_serverless_files(subdirs, found_serverless);
};


module.exports = {
    "process_serverless": process_serverless,
    "load_yaml_from_filename": load_yaml_from_filename,
    "find_serverless_files": find_serverless_files
};
