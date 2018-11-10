"use strict";

let fs = require("fs");
let {process_serverless, find_serverless_files, load_yaml_from_filename} = require("./serverless_yml_processing");
let {walk_ast} = require("./call_graph_analysis");
let {CallGraph} = require("./call_graph");
let parser = require("esprima");


function main(directories) {
    let files = find_serverless_files(directories);
    let graph = files
        .map(load_yaml_from_filename)
        .map(([f, y]) => process_serverless(y, f))
        .reduce((a,n) => a.union_graphs(n), new CallGraph());

    let initial_files = [...graph.nodes].filter((n) => n.type === "lambda");


    while (initial_files.length > 0 ) {
        let next_method = initial_files.shift();
        let lambda_filename = next_method.context.slice(0, next_method.context.lastIndexOf("/")) + "/" + next_method.label.slice(0, next_method.label.indexOf(".")) + ".js";
        let lambda_entrypoint = next_method.label.slice(next_method.label.indexOf(".") + 1);

        let entry_file = fs.readFileSync(lambda_filename, 'utf8');
        let ast = parser.parseModule(entry_file);
        walk_ast(ast, next_method, null);
    }//while we have files to process

}//main

if (require.main === module) {
    main(process.argv.slice(2));
}
