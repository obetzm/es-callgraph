let {GraphNode, GraphEdge, CallGraph} = require("./call_graph");
let {Possibilities, ObjectScope} = require("./scope");

class ConstraintTarget {
    static make(scope, from) {
        if (from.type === "MemberExpression") return new MemberConstraintTarget(scope, from);
        else if (from.type === "Identifier") return new IdentifierConstraintTarget(scope, from);
        else  throw new Error("Invalid constraint target: " + from.type);
    }
}

class MemberConstraintTarget {
    constructor(scope, member_expr) {
        let field_stack = [];
        let leftmost = member_expr;
        while (leftmost && leftmost.type === "MemberExpression") {
            field_stack.push(leftmost.property.name);
            leftmost = leftmost.object;
        }
        field_stack.push(leftmost.name);
        this.field_stack = field_stack;
        this.scope = scope;
    }
}

class IdentifierConstraintTarget {
    constructor(scope, identifier_expr) {
        this.name = identifier_expr.name;
        this.scope = scope;
    }
}


function resolve_member_constraint(member_constraint) {
    let fields = member_constraint.field_stack.slice(); //shallow copy of fields so we can pop
    let first_field = fields.pop();
    let targets;
    let first_found = member_constraint.scope.lookup(first_field);
    if (first_found.values === null) targets = [];
    else targets = [first_found.values];
    while(fields.length > 0 && targets.length > 0) {
        let next_field = fields.pop();
        let next_targets = []
        targets.forEach((candidate_possibilities) => {
            candidate_possibilities.values.forEach((val) => {
               let found = val.lookup(next_field);
               if (found.values !== null) next_targets.push(found.values);
            });
        });
        targets = next_targets;
    }
    return targets;
}


class AssignConstraint {
    constructor(from, to) {
        this.from = from;
        this.to = to;
    }

    execute_constraint() {
        let resolved_from;
        if (this.from instanceof Possibilities || this.from instanceof ObjectScope )
            resolved_from = this.from;
        else if (this.from instanceof ObjectScope )
            resolved_from = this.from;
        else if (this.from instanceof IdentifierConstraintTarget )
            resolved_from = this.from.scope.lookup(this.from.name);
        else if (this.from instanceof MemberConstraintTarget ) {
            resolved_from = resolve_member_constraint(this.from);
        }
        else throw new Error("error executing assignment constraint. Unrecognized 'from' type.");

        let resolved_to;
        if (this.to instanceof Possibilities || this.to instanceof ObjectScope ) {
            resolved_to = this.to;
        }
        else if (this.to instanceof IdentifierConstraintTarget ) {
            let {values, _} = this.to.scope.lookup(this.to.name);
            resolved_to = ( values ) ? values : this.to.scope.define(this.to.name, null);
        }
        else if (this.to instanceof MemberConstraintTarget ) {
            resolved_to = resolve_member_constraint(this.to);
            resolved_to = resolved_to[0];
        }
        else {
            console.log(this.to);
            throw new Error("error executing assignment constraint. Unrecognized 'to' type.");
        }

        if (!resolved_to.receive_possibilities) {
            console.log("WARNING: could not resolve resolved_to for:" );
            console.log(this.to);
        }
        return (typeof resolved_to.receive_possibilities === "function") && resolved_to.receive_possibilities(resolved_from);
    }
}

class CallConstraint {
    constructor(context, callee) {
        this.scope = context;
        this.callee = callee;
    }

    execute_constraint() {
        if (this.scope.associated_funcs) {
            let caller = this.scope.associated_funcs.values[0];

            if (this.callee instanceof IdentifierConstraintTarget) {
                let {values, _} = this.scope.lookup(this.callee.name);
                if (values) {
                    values.values.forEach((callee) => {
                        if (callee instanceof GraphNode) {
                            CallGraph.instance.add_edge(new GraphEdge(caller, callee));
                        }
                    });
                }
            } else if (this.callee instanceof MemberConstraintTarget) {
                let at_least_one_added = false;
                resolve_member_constraint(this.callee).forEach((val) => {
                    if (val instanceof GraphNode) {
                        CallGraph.instance.add_edge(new GraphEdge(caller, val));
                        at_least_one_added = true
                    }
                });
                if ( !at_least_one_added ) {
                    console.log("Warning: no resolutions found for method function call.")
                }
            }
        } else {
            //console.log("Warning: unable to determine edge for function call: "  + this.callee);
        }
    }

}

module.exports = {
    AssignConstraint: AssignConstraint,
    CallConstraint: CallConstraint,
    ConstraintTarget: ConstraintTarget
};