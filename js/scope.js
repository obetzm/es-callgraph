

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
}

class FunctionScope {
    constructor(par, id) {
        this.parent = par;
        this.id = id;
        this.children = [];
        this.declarations = {}
    }

    create_subscope(id) {
        let new_scope = new FunctionScope(this, id);
        this.children.push(new_scope);
        return new_scope;
    }

    bootstrap_toplevel() {
        define("exports", new ObjectScope(this, "exports"));
    }

    close_scope() {
        return this.parent;
    }


    define(identifier, init) {
        let {values, scope} = this.lookup(identifier);
        values = values || new Possibilities();
        scope = scope || this;
        if (init) values.push(init);
        scope.declarations[identifier] = values;
    }

    lookup(identifier) {
        let declared_in_this_scope = this.declarations.hasOwnProperty(identifier);
        return (declared_in_this_scope) ? { "values": this.declarations[identifier], "scope": this } :
                              (this.parent) ? this.parent.lookup(identifier) : {"values": null, "scope": null };
    }
}

class ObjectScope {
    constructor(par, id) {
        this.parent = par;
        this.id = id;
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
  FunctionScope: Scope,
  ObjectScope: ObjectScope
};