
let babel = require("@babel/core");

exports.generateAst = (test) => {
    let transformed_file = babel.transformFileSync("targets/dummies/simple.js", { ast: true, presets: [
        ["@babel/preset-env",
            {"targets": {"ie": "9"}}]
    ]});
    console.log(JSON.stringify(transformed_file.ast, null, 2));
    test.done();
};