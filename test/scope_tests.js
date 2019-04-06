let {FunctionScope} = require("../js/scope");



exports.test_scope_generation = (test) => {
    let scope = new FunctionScope(null, 0);
    let child_scope = scope.create_subscope(1);
    let grandchild_scope = scope.create_subscope(2);

    test.equal(scope, grandchild_scope.get_toplevel_scope());
    test.done()

};


exports.test_simple_assignment = (test) => {
    let scope = new FunctionScope(null, 0);
    let assign_key = "x";
    let assign_val = 4;

    scope.define(assign_key, assign_val);
    let returned_possibilities = scope.lookup(assign_key).values;

    test.equal(1, returned_possibilities.count);
    test.equal(assign_val, returned_possibilities.values[0]);
    test.done()

};



exports.test_parent_lookup = (test) => {
    let scope = new FunctionScope(null, 0);
    let sub_scope = scope.create_subscope();

    let assign_key = "x";
    let assign_val = 4;
    scope.define(assign_key, assign_val);

    let returned_possibilities = sub_scope.lookup(assign_key).values;

    test.equal(1, returned_possibilities.count);
    test.equal(assign_val, returned_possibilities.values[0]);
    test.done()

};


exports.test_parent_assignment = (test) => {
    let scope = new FunctionScope(null, 0);
    let sub_scope = scope.create_subscope();

    let assign_key = "x";
    let assign_val = 4;
    scope.define(assign_key, assign_val);

    let new_val = 5;
    sub_scope.assign(assign_key, new_val);

    let returned_possibilities = sub_scope.lookup(assign_key);
    let poss_vals = returned_possibilities.values;
    let returned_scope = returned_possibilities.scope;

    test.equal(2, poss_vals.count, "Both old and new value not represented in possibilities.");
    test.equal(assign_val, poss_vals.values[0], "Old value does not match expected value.");
    test.equal(new_val, poss_vals.values[1], "New value does not match expected value.");
    test.equal(scope, returned_scope, "The scope x was found in was not the scope it was declared in.");
    test.ok( !sub_scope.declarations.hasOwnProperty(assign_key), "The sub_scope has declared its own x instead of using its parent's x.");
    test.done()
};