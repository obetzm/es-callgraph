"use strict";

let parser = require("esprima");
let yaml = require("js-yaml");
let fs = require("fs");
let process_serverless = require("./serverless_yml_processing");
let {CallGraph} = require("./call_graph");


function parse_lambda(entry_file, main_method, ancestor_node) {
    let ast = parser.parseScript(lambda_content);
    console.log(ast)

    return [] //new things that need processing
}

let load_yaml_from_filename = (filename) => [filename, yaml.safeLoad(fs.readFileSync(filename, 'utf8'))];


function main(files) {
    let graph = files
        .map(load_yaml_from_filename)
        .map(([f, y]) => [f, process_serverless(y)])
        .map(([f, g]) => g.set_context_on_nodes(f))
        .reduce((a,n) => a.union_graphs(n), new CallGraph());

    let worklist = [...graph.nodes].filter((n) => n.type === "lambda");

    while (worklist.length > 0 ) {
        let next_method = worklist.pop(0);
        let lambda_filename = next_method.context.slice(0, next_method.context.lastIndexOf("/")) + "/" + next_method.label.slice(0, next_method.label.indexOf(".")) + ".js";
        let lambda_entrypoint = next_method.label.slice(next_method.label.indexOf(".") + 1);

        let entry_file = fs.readFileSync(lambda_filename, 'utf8');
        parse_lambda(entry_file, lambda_entrypoint, next_method);
    }//while the worklist is not empty

}//main

main(process.argv.slice(2));
