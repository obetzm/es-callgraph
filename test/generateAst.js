
let fs = require("fs");
let parser = require("esprima");

exports.generateAst = (test) => {
    console.log(JSON.stringify(parser.parseModule(fs.readFileSync("targets/dummies/simple.js", "utf-8")), null, 2));
    test.done();
};