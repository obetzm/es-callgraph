
let {CubicVisitor} = require("../js/analysis_rewrite/cubic_visitor");
let {solve} = require("../js/analysis_rewrite/cubic_solver");
let primer = require("../js/analysis_rewrite/prime_tree");
let fs = require("fs");
let parser = require("esprima");

exports.cubicTest = (test) => {
    let test_file = fs.readFileSync("test/cubic_example.js", "utf-8");
    let file_ast = parser.parseModule(test_file);
    let visitor_ast = primer.rewrite_ast(file_ast, "global");
    visitor_ast.children.forEach((f) => console.log(`${f._name} :--  ${JSON.stringify(f.body)}`));
    let visitor = new CubicVisitor(["main"]);
    visitor_ast.apply(visitor);

    solve(visitor.constraints);


    test.done();
};