"use strict";

let fs = require("fs");
let {process_yaml, find_serverless_files, load_yaml_from_filename} = require("./serverless_yml_processing");
let {CallGraph} = require("./call_graph");
let {draw_graph} = require("./draw_graph");
let babel = require("@babel/core");
let traverse = require("@babel/traverse");
let cg_visitor = require("./babel_visitor");

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

        let transformed_file = babel.transformFileSync(lambda_filename, { ast: true, presets: [
            ["@babel/preset-env",
            {"targets": {"ie": "9"}}]
        ]});
        //walk_ast(ast, next_method, null);


        //let CGA = new CallGraphVisitor([next_method]);
        //let visitor_ast = rewrite_ast(ast, next_method.group);
        //visitor_ast.apply(CGA);

        traverse.default(transformed_file.ast, cg_visitor)

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
