
let fs = require("fs");
let parser = require("esprima");
let {rewrite_ast} = require("../js/analysis_rewrite/prime_tree");

exports.generateAst = (test) => {
    let ast = parser.parseModule(fs.readFileSync("targets/dummies/simple.js", "utf-8"));
    console.log(rewrite_ast(ast, "dummy"));
    test.done();
};