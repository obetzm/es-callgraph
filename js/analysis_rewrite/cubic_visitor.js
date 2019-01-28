let {FunctionNode,FieldAccessNode,VariableNode, FuncCallNode, ObjectNode} = require("./prime_tree");
let {AbstractVisitor} = require("./abstract_visitor");
let {AnalysisScope, AnalysisValue} = require("../call_graph_analysis");


class DeclareConstraint {
    /*
       A constraint in the form:
           AST_node ∈ name, e.g

           function sum(a,b) { c = a + b; return c; }          would become
           <func_decl> ∈ {"sum"}
     */
    constructor (name, func) {
        this.name = name;
        this.func = func;
    }
}

class AssignConstraint {
    /*
       A constraint in the form:
           rhs ⊆ lhs, e.g

           let plus = sum;          would become
           {"sum"} ⊆ {"plus"}
     */
    constructor (from, to) {
        this.from = from;
        this.to = to;
    }
}

class CallConstraint {
    /*
       A constraint in the form:
           resolved_func ∈ called_func => {called_arg ⊆ func_param} and func_ret ⊆ func_call, e.g

           let answer = sum(x,y);      would become
           <sum_decl> ∈ {"sum"} => {"x"} ⊆ {"a"} and {"y"} ⊆ {"b"} and {"c"} ⊆ {"sum(a,b)"}
     */
    constructor (condition, implied_args, implied_ret) {
        this.condition = condition;
        this.implied_args = implied_args;
        this.implied_ret = implied_ret;
    }
}



class CubicVisitor extends AbstractVisitor {

    constructor (entrypoints) {
        super();
        this.constraints = [];
    }

    visitAssignment(assgn_stmt) {
        if (assgn_stmt.rhs instanceof FunctionNode) {
            this.constraints.push(new DeclareConstraint(assgn_stmt.lhs, assgn_stmt.rhs));
        }
        else {
            this.constraints.push(new AssignConstraint(assgn_stmt.right, assgn_stmt.left));
            if (assgn_stmt.rhs instanceof FuncCallNode) {
                this.visitFuncCall(assgn_stmt.rhs);
            }
        }
    }//visitAssignment

    visitFunctionDeclaration(func_stmt) {
        if (func_stmt.name) {
            this.constraints.push(new DeclareConstraint(func_stmt.name, func_stmt));
        }
        func_stmt.exec(this); //traverse the body of the function once, right now
    }

    visitFuncCall(call_stmt) {
        /*
           foreach possible resolution: possibility ∈ called_func => {called_arg ⊆ possib_param} and possib_ret ⊆ func_call

           the possibilities (and therefore the return type and arg-param pairings) can't be calculated until we've
           collected all constraints...
         */

        let condition = new DeclareConstraint(undefined, call_stmt.callee);
        let args = call_stmt.params.map((p) => new AssignConstraint(p, undefined));
        let ret = new AssignConstraint(undefined, call_stmt);
        this.constraints.push(new CallConstraint(condition, args, ret));
    }//visitFuncCall


}//CallGraphVisitor

module.exports = {
    CubicVisitor: CubicVisitor,
    DeclareConstraint: DeclareConstraint,
    AssignConstraint: AssignConstraint,
    CallConstraint: CallConstraint
};