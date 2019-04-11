
let {GraphNode} = require("./call_graph");

class Possibilities {
    constructor(...init) {
        this.values = init || []
    }

    push(val) {
        this.values.push(val)
    }
    add(val) {
        this.push(val)
    }

    receive_possibilities(b) {
        let value_added = false;
        if (b instanceof Possibilities) {
            b.values.forEach((v) => {
                if (this.values.indexOf(v) === -1) {
                    this.values.push(v);
                    value_added = true;
                }
            });
        }
        else if (this.values.indexOf(b) === -1) {
            this.values.push(b);
            value_added = true;
        }

        return value_added;
    }

    get count() {
        return this.values.length;
    }
}

class FunctionScope {
    constructor(par, id) {
        this.parent = par;
        this.id = id;
        this.children = [];
        this.declarations = {};
        this.associated_funcs = null;
    }

    create_subscope(id) {
        let new_scope = new FunctionScope(this, id);
        this.children.push(new_scope);
        return new_scope;
    }

    bootstrap_toplevel(state, node) {
        this.associated_funcs = new Possibilities(new GraphNode("lambda", state.file + ".init", false, state.lambda_id, node, state.file));

        let export_obj = new ObjectScope();
        let module_obj = new ObjectScope();
        module_obj.define("exports", export_obj);
        this.define("exports", export_obj);
        this.define("module", module_obj);
    }

    close_scope() {
        return this.parent;
    }

    lookup(identifier) {
        let declared_in_this_scope = this.declarations.hasOwnProperty(identifier);
        return (declared_in_this_scope) ? { "values": this.declarations[identifier], "scope": this } :
            (this.parent) ? this.parent.lookup(identifier) : {"values": null, "scope": null };
    }

    /* An explicit declaration of a variable, always in the current scope.
       E.g var x = 5;  function myfunc() {}... */
    define(identifier, init) {
        let declared_in_this_scope = this.declarations.hasOwnProperty(identifier);
        let values = (declared_in_this_scope) ? this.declarations[identifier] : new Possibilities();
        if (init) values.push(init);
        this.declarations[identifier] = values;
        return values;
    }


    /* A normal assignment to a variable. In strict mode this must have already been declared with define(), but
       otherwise may implicitly define in the global scope if no matching declaration exists.
       E.g y = 4
     */
    assign(identifier, init) {
        let {values, scope} = this.lookup(identifier);
        values = values || new Possibilities();
        scope = scope || this.get_toplevel_scope();
        if (init) values.push(init);
        scope.declarations[identifier] = values;
    }


    get_toplevel_scope() {
        let s = this;
        while (s.parent) s = s.parent;
        return s;
    }

    generate_entrypoint_calls(state) {
        console.log("Entrypoint is: ")
    }
}

class ObjectScope {
    constructor() {
        this.declarations = {}
    }


    define(identifier, init) {
        let {values, scope} = this.lookup(identifier);
        values = values || new Possibilities();
        scope = scope || this;
        if (init) values.push(init);
        scope.declarations[identifier] = values;
    }

    lookup(identifier) {//TODO: computed
        let declared_in_this_scope = this.declarations.hasOwnProperty(identifier);
        return (declared_in_this_scope) ? { "values": this.declarations[identifier], "scope": this } :  {"values": null, "scope": null };
    }
}


module.exports = {
  FunctionScope: FunctionScope,
  ObjectScope: ObjectScope,
  Possibilities: Possibilities
};