"use strict";

let fs = require("fs");
let {process_yaml, find_serverless_files, load_yaml_from_filename} = require("./serverless_yml_processing");
let {CallGraph} = require("./call_graph");
let parser = require("esprima");
let {draw_graph} = require("./draw_graph");
let {rewrite_ast} = require("./analysis_rewrite/prime_tree");
let {CallGraphVisitor} = require("./analysis_rewrite/callgraph_visitor");


function main(directories) {
    let files = find_serverless_files(directories);
    let graph = files
        .map(load_yaml_from_filename)
        .map(([f, y]) => process_yaml(y, f))
        .reduce((a,n) => a.union_graphs(n), new CallGraph());

    let initial_files = [...graph.nodes].filter((n) => n.type === "lambda");


    while (initial_files.length > 0 ) {
        let next_method = initial_files.shift();
        let lambda_filename = next_method.context.slice(0, next_method.context.lastIndexOf("/")) + "/" + next_method.file;

        let entry_file = fs.readFileSync(lambda_filename, 'utf8');
        let ast = parser.parseModule(entry_file);
        //walk_ast(ast, next_method, null);


        let CGA = new CallGraphVisitor([next_method]);
        let visitor_ast = rewrite_ast(ast, next_method.group);
        visitor_ast.apply(CGA);
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
