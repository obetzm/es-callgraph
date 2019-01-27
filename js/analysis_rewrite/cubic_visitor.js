let {FunctionNode,FieldAccessNode,VariableNode, FuncCallNode, ObjectNode} = require("./prime_tree");
let {AbstractVisitor} = require("./abstract_visitor");
let {AnalysisScope, AnalysisValue} = require("../call_graph_analysis");


class DeclareConstraint {
    constructor (name, func) {
        this.name = name;
        this.func = func;
    }
}

class AssignConstraint {
    constructor (from, to) {
        this.from = from;
        this.to = to;
    }
}

class CallConstraint {
    constructor (cond, impl) {
        this.cond = cond;
        this.impl = impl;
    }
}



class CubicVisitor extends AbstractVisitor {

    constructor (entrypoints) {
        super();
        this.constraints = [];
    }

    visitAssignment(assgn_stmt) {
    }//visitAssignment

    visitFunctionDeclaration(func_stmt) {
        this.constraints.push(new DeclareConstraint(func_stmt.name, func_stmt));
    }

    visitFuncCall(call_stmt) {
    }//visitFuncCall
}//CallGraphVisitor

module.exports = {
    CubicVisitor: CubicVisitor
};