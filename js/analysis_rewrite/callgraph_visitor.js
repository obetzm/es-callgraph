let {CallGraph,GraphNode,GraphEdge} = require("../call_graph");
let {AbstractNode,FunctionNode,FieldAccessNode,VariableNode} = require("./prime_tree");
let {AbstractVisitor} = require("./abstract_visitor");
let {AnalysisScope, AnalysisValue} = require("../call_graph_analysis");

class CallgraphVisitor extends AbstractVisitor {

    constructor (entrypoints) {
        super();
        this.scope = new AnalysisScope();
        this.coming_from = null;
        this.entrypoints = entrypoints;
    }

    visitAssignment(assgn_stmt) {
        if (assgn_stmt.rhs instanceof FunctionNode) {
            let lhs = assgn_stmt.lhs.name;
            let assigned_to = this.scope.find(lhs);
            if (assigned_to === null) {
                console.log("cannot find " + lhs);
            }
            else {
                assigned_to.add(assgn_stmt.rhs);
            }
        }


        if (assgn_stmt.lhs instanceof FieldAccessNode
              && assgn_stmt.lhs.obj.name === "module"
              && assgn_stmt.lhs.field.name === "exports") {

                 let entry_method_name = this.entrypoints[0].label;
                 console.log("Entry method is:" + entry_method_name);
                 let entry_node = assgn_stmt.rhs.properties[entry_method_name];//TODO: call the collapse here
                 if (entry_node instanceof FunctionNode) {
                     this.exec_func(entry_node);
                 }
                 else if (entry_node instanceof VariableNode) {
                     let entry_methods = this.scope.find(entry_node.name);
                     if ( entry_methods ) {
                         entry_methods.possibilities.forEach((p) => this.exec_func(p));
                     }
                 }
        }
    }

    visitFunctionDeclaration(func_stmt) {
        if (func_stmt.name) {
            let lhs = func_stmt.name;
            if (this.scope.find(lhs)) {
                this.scope.find(lhs).add(func_stmt);
            } else this.scope.set(lhs, new AnalysisValue(func_stmt));
        }
    }

    visitFuncCall(call_stmt) {
        //TODO: if rhs is require()
        let cg = CallGraph.instance;
        let called_func = this.scope.find(call_stmt.callee).possibilities[0];
        console.log("at function call: " + call_stmt.callee);
        if (this.coming_from) {
            cg.add_edge(new GraphEdge(this.coming_from, called_func.node));
        }

        this.exec_func(called_func);
    }

    exec_func(called_func) {
        let stack_frame = this.coming_from;
        let stack_scope = this.AnalysisScope;
        this.AnalysisScope = new AnalysisScope(this.AnalysisScope);
        this.coming_from = called_func.node;
        console.log(called_func);
        called_func.exec(this);
        this.AnalysisScope = stack_scope;
        this.coming_from = stack_frame;
    }
}//CallGraphVisitor

module.exports = {
    CallGraphVisitor: CallgraphVisitor
};