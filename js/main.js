"use strict";

let fs = require("fs");
let parser = require("esprima");
let {process_serverless, find_serverless_files, load_yaml_from_filename} = require("./serverless_yml_processing");
let {CallGraph,GraphNode,GraphEdge} = require("./call_graph");


function walk_ast(entry_file, main_method, entry_node, ancestor) {
    let ast = parser.parseModule(entry_file);
    let new_nodes = [];

    ast.body.forEach((stmt) => {
        console.log(JSON.stringify(stmt, null, 2));
        if (stmt.type === "FunctionExpression" && id.name !== undefined && id.name !== null) {
            let found_method = new GraphNode("lambda", main_method+"."+id.name);
            new_nodes.push(found_method);
            walk_ast(stmt.body, main_method, entry_node, found_method);
        }
        //look for pattern of call to db function
    });

    return new_nodes //nodes updated by this parse
}

function main(directories) {
    let files = find_serverless_files(directories);
    let graph = files
        .map(load_yaml_from_filename)
        .map(([f, y]) => [f, process_serverless(y)])
        .map(([f, g]) => g.set_context_on_nodes(f))
        .reduce((a,n) => a.union_graphs(n), new CallGraph());

    let initial_files = [...graph.nodes].filter((n) => n.type === "lambda");


    while (initial_files.length > 0 ) {
        let next_method = initial_files.shift();
        let lambda_filename = next_method.context.slice(0, next_method.context.lastIndexOf("/")) + "/" + next_method.label.slice(0, next_method.label.indexOf(".")) + ".js";
        let lambda_entrypoint = next_method.label.slice(next_method.label.indexOf(".") + 1);

        let entry_file = fs.readFileSync(lambda_filename, 'utf8');
        walk_ast(entry_file, lambda_entrypoint, next_method, null);
    }//while we have files to process

}//main

if (require.main === module) {
    main(process.argv.slice(2));
}
