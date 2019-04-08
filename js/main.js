"use strict";

let fs = require("fs");
let {process_yaml, find_serverless_files, load_yaml_from_filename} = require("./serverless_yml_processing");
let {CallGraph,GraphEdge} = require("./call_graph");
let {draw_graph} = require("./draw_graph");
let babel = require("@babel/core");
let traverse = require("@babel/traverse");
let cg_visitor = require("./babel_constraint_generator");
let {FunctionScope} = require("./scope");
let constraint_solver = require("./constraint_solver");


function main(directories) {
    let files = find_serverless_files(directories);
    let graph = files
        .map(load_yaml_from_filename)
        .map(([f, y]) => process_yaml(y, f))
        .reduce((a,n) => a.add_nodes(n), new CallGraph());

    let event_list = [...graph.nodes];

    while (event_list.length > 0 ) {
        let next_event = event_list.shift();
        let next_file = next_event.rep.file;
        console.log("Starting analysis of: " + next_file);
        let transformed_file = babel.transformFileSync(next_file, { ast: true, presets: [
            ["@babel/preset-env",
            {"targets": {"ie": "9"}}]
        ]});

        let id = transformed_file.options.filename.replace(transformed_file.options.cwd, '.');
        let toplevel_scope = new FunctionScope(null, 0);
        let state = {
            current_scope: toplevel_scope,
            toplevel_scope: toplevel_scope,
            file: id,
            entrypoint: next_event.rep.func,
            lambda_id: id + "." + next_event.rep.func,
            constraints: {
                assignments: [],
                calls: []
            }
        };
        toplevel_scope.bootstrap_toplevel(state, transformed_file.ast);

        traverse.default(transformed_file.ast, cg_visitor, undefined, state);

        constraint_solver(state);

        console.log("FINAL SCOPE FOR " + id + ": ");
        console.log(state.toplevel_scope);



    }//while we have files to process
    console.log("Produced graph:\n");
    console.log("Nodes");
    console.log([...graph.nodes].map((n)=> " === " + n.label).join("\n"));
    console.log("Edges");
    console.log([...graph.edges].map((e)=> " === " + e.from.label + " : " + e.to.label).join("\n"));

    draw_graph(graph)
        .then((img) => {
            let img_data = img.split(';base64,').pop();
            let outfile = 'output.png';
            fs.writeFile(outfile, img_data, {encoding: 'base64'},
                (err)=> (err === null) ? console.log(`Generated ${outfile}`) : console.log("Error: " + err));
        });

}//main

if (require.main === module) {
    main(process.argv.slice(2));
}
