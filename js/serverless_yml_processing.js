"use strict";

let {GraphNode, GraphEdge, CallGraph} = require("./call_graph");
let yaml = require("js-yaml");
let fs = require("fs");
let path = require("path");


const serverless_event_label_map = Object.freeze({
    "stream": (e) => e.arn,
    "http": (e) => `${e.path}/${e.method}`,
    "s3": (e) => e.bucket
});

const cf_event_label_map = Object.freeze({
    "Api": (e) => `${e.Properties.Method} ${e.Properties.Path}`,
    "S3": (e) => e.Properties.Bucket.Ref, //TODO: ref to another variable defined in the yml
    "Schedule": (e) => `Scheduled Event`
});

const cf_event_to_serverless_event = Object.freeze({
   "Api": "http",
   "S3": "s3",
   "Stream": "stream",
   "Schedule": "Schedule"
});


let create_filepath = function (ctx, rel_path) {
    let cwd = ctx.split("/");
    cwd.pop();
    return cwd.join("/") + "/" + rel_path + ".js";
}

let process_yaml = function (config, ctx) {
    console.log("Processing: " + ctx);
    if (ctx.indexOf("serverless") === -1) {
        return process_cloudformation(config, ctx);
    } else {
        return process_serverless(config, ctx);
    }

};

function cf_event_to_node(e, fn_file, fn_name, ctx) {
    let isEntry = (e.Type === "Api");
    let label = cf_event_label_map[e.Type](e);
    return new GraphNode(cf_event_to_serverless_event[e.Type], label, isEntry, undefined, {file: create_filepath(ctx, fn_file), func: fn_name});
}

function cloudformation_config_function_to_graph(id, fn, ctx) {
    let [fn_file,fn_name] = fn.Properties.Handler.split(".");
    if (fn.Properties.Events === undefined )  { fn.Properties.Events=[]; }
    return Object.keys(fn.Properties.Events)
        .map((e) => fn.Properties.Events[e])
        .map((e) => cf_event_to_node(e, fn_file, fn_name, ctx))
        .map((n)=> n.set_context(ctx, fn_file));

}

let process_cloudformation = function(config, ctx) {
    return Object.keys(config.Resources)
        .map((r) => ({name: r, dat: config.Resources[r]}))
        .filter((r) => r.dat.Type === "AWS::Serverless::Function")
        .map((fn) => cloudformation_config_function_to_graph(fn.name, fn.dat, ctx))
        .reduce((a,n) => a.concat(n), []);
};


function serverless_event_to_node(e, fn_file, fn_name, ctx) {
    let type = Object.keys(e)[0];
    let isEntry = (type === "http");
    let label = serverless_event_label_map[type](e[type]);
    return new GraphNode(type, label, isEntry, undefined, {file: create_filepath(ctx, fn_file), func: fn_name});
}


function serverless_config_function_to_graph(fn, ctx) {
    let [fn_file,fn_name] = fn.handler.split(".");
    if (fn.events === undefined )  { fn.events=[]; }
    return fn.events
        .map((e) => serverless_event_to_node(e, fn_file, fn_name, ctx))
        .map((n)=> n.set_context(ctx, fn_file));
}


let process_serverless = function (config, ctx) {
        if (config.functions === undefined) {
            config.functions = [];
        }
        return Object.keys(config.functions)
            .map((f) => config.functions[f])
            .map((fn) => serverless_config_function_to_graph(fn, ctx))
            .reduce((a,n) => a.concat(n), []);
};


let load_yaml_from_filename = (filename) => [filename, yaml.safeLoad(fs.readFileSync(filename, 'utf8'))];


let find_serverless_files = (paths, known) => {
    known = known === undefined ? [] : known;
    let path_contents = paths
        .reduce((all_paths, path) => all_paths.concat(fs.readdirSync(path).map((file) => path + "/" + file)), []);

    let found_serverless = known.concat(path_contents.filter((p) => p.endsWith(".yml") || p.endsWith(".yaml")));
    let subdirs = path_contents.filter((p) => fs.statSync(p).isDirectory() && -1 === p.indexOf("node_modules"));

    if (subdirs.length === 0)
        return found_serverless;
    return find_serverless_files(subdirs, found_serverless);
};


module.exports = {
    "process_yaml": process_yaml,
    "load_yaml_from_filename": load_yaml_from_filename,
    "find_serverless_files": find_serverless_files
};
