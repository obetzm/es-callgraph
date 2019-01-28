
let {DeclareConstraint} = require("./cubic_visitor");


function divide_constraints(constraints) {
    return constraints.reduce((a,c) => (c instanceof DeclareConstraint) ? [a[0].concat(c),a[1]] : [a[0],a[1].concat(c)], [[],[]])
}


module.exports = {
    solve: function (constraints) {
        let [decl_constraints, other_constraints] = divide_constraints(constraints);
        console.log(decl_constraints);

        decl_constraints.forEach()
    }
};