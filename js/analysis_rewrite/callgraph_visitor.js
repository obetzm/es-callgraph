let {CallGraph,GraphNode,GraphEdge} = require("../call_graph");
let {FunctionNode,FieldAccessNode,VariableNode, FuncCallNode, ObjectNode, NewNode} = require("./prime_tree");
let {AbstractVisitor} = require("./abstract_visitor");
let {AnalysisScope, AnalysisValue} = require("../call_graph_analysis");


class AnalysisAmazonNode extends ObjectNode {
    constructor () {
        super("", []);
    }
    find(property) {
        return (property === "DynamoDB") ? new AnalysisValue(new AnalysisDynamoNode()) :
            (property === "SES") ? new AnalysisValue(new AnalysisEmailerNode()) : null;
    }
}

class AnalysisDynamoNode extends ObjectNode {
    constructor () {
        super("", []);
    }
    find(property) {
        return (property === "DocumentClient") ? new AnalysisValue(new AnalysisDBClientNode()) : null;
    }
}

class AnalysisDBClientNode extends ObjectNode {
    constructor () {
        super("", []);
        console.log("Spawning a Client Node");
    }
    find(property) {
        console.log("FINDING CLIENT: " + property);
             if (property === "update" || property === "put") return new AnalysisValue(new AnalysisDBUpdate());
        else if (property === "scan") return new AnalysisValue(new AnalysisDBRead());
        else return null;
    }
}

class AnalysisDBUpdate {
    constructor() {}
    exec(params) {

    }
}

class AnalysisDBRead {
    constructor() {}
    exec(params) {

    }
}

class AnalysisEmailerNode extends ObjectNode {
    constructor () {
        super("", []);
    }
    find(property) {
        return (property === "sendEmail") ? new AnalysisValue(new AnalysisOutgoingEmail()) : null;
    }
}

class AnalysisOutgoingEmail {
    constructor() {}
    exec(params) {

    }
}



/*
                   ESPrima field accesses are deep on the left, i.e
                      first.second.third =>    obj
                                               /  \
                                             obj  "third"
                                            /    \
                                        "first"   "second"
                */
let resolveField = (scope, access_node) => {
    if (access_node === null) return null;
    if (access_node instanceof FieldAccessNode) {
        let parent_obj = resolveField(scope, access_node.obj);
        if (parent_obj === null) return null;
        else return parent_obj.possibilities[0].find(access_node.field.name); //TODO: all possibilities, not just first
    } else return scope.find(access_node.name);
};


class CallgraphVisitor extends AbstractVisitor {

    constructor (entrypoints) {
        super();
        this.scope = new AnalysisScope();
        this.coming_from = null;
        this.entrypoints = entrypoints;
    }

    visitAssignment(assgn_stmt) {
        if (assgn_stmt.lhs instanceof FieldAccessNode) {

            if ((assgn_stmt.lhs.obj.name === "module" && assgn_stmt.lhs.field.name === "exports")){

                let entry_method_name = this.entrypoints[0].label;
                console.log("Entry method is:" + entry_method_name);
                let entry_func = assgn_stmt.rhs.properties[entry_method_name];
                if (entry_func instanceof FunctionNode) {
                    CallGraph.instance.merge_nodes(this.entrypoints[0], entry_func.node);
                    entry_func.node = this.entrypoints[0]; //TODO: this is unsafe if more than one function holds a ref
                    this.exec_func(entry_func);
                }
                else if (entry_func instanceof VariableNode) {
                    let entry_methods = this.scope.find(entry_func.name);
                    if (entry_methods) {
                        entry_methods.possibilities.forEach((p) => {
                            CallGraph.instance.merge_nodes(this.entrypoints[0], p.node);
                            p.node = this.entrypoints[0]; //TODO: this is unsafe if more than one function holds a ref
                            this.exec_func(p)
                        });
                    }//if entry method was found
                }//if the entry function is not declared in module.exports
            }//if the assignment is to module.exports
            else if (assgn_stmt.lhs.obj.name === "exports") {
                let entry_method_name = this.entrypoints[0].label;
                let func_name = assgn_stmt.lhs.field.name;
                if (func_name === entry_method_name) {
                    let entry_func = assgn_stmt.rhs;
                    CallGraph.instance.merge_nodes(this.entrypoints[0], entry_func.node);
                    entry_func.node = this.entrypoints[0]; //TODO: this is unsafe if more than one function holds a ref
                    this.exec_func(entry_func);
                }//if the thing assigned to exports is the entry method
            }//if the assignment is to exports.VARNAME
        }//if the assignment is a field write


        else if (assgn_stmt.rhs instanceof FunctionNode) {
            let lhs = assgn_stmt.lhs.name;
            let assigned_to = this.scope.find(lhs);
            if (assigned_to === null) {
                assigned_to = new AnalysisValue();
                this.scope.set(lhs, assigned_to);
            }
            assigned_to.add(assgn_stmt.rhs);

            if (assgn_stmt.rhs.name === null) {
                assgn_stmt.rhs.name = lhs;
            }
        } else if (assgn_stmt.rhs instanceof FuncCallNode) {//if we're storing the result of a function
            if (assgn_stmt.rhs.callee.name
                && assgn_stmt.rhs.callee.name === "require") {//if it's an import
                if (assgn_stmt.rhs.params[0].value === "aws-sdk") {//if we're importing the Amazon SDK
                    this.scope.set(assgn_stmt.lhs.name, new AnalysisValue(new AnalysisAmazonNode()))
                }//if require("amazon-sdk")
            }//if require
            else {//NOTE: this is necessary to store dynamo.update, but should eventually store all values
                let resolved_func = resolveField(this.scope, assgn_stmt.rhs.callee);
                this.scope.set(assgn_stmt.lhs.name, resolved_func);
            }
        } else if (assgn_stmt.rhs instanceof NewNode ) {//if we're storing the result of an object initialization
            let resolved_func = resolveField(this.scope, assgn_stmt.rhs.initialized);
            this.scope.set(assgn_stmt.lhs.name, resolved_func);
        }

    }//visitAssignment

    visitFunctionDeclaration(func_stmt) {
        if (func_stmt.name) {
            let lhs = func_stmt.name;
            if (this.scope.find(lhs)) {
                this.scope.find(lhs).add(func_stmt);
            } else this.scope.set(lhs, new AnalysisValue(func_stmt));
        }
    }

    visitFuncCall(call_stmt) {
        let cg = CallGraph.instance;

        let func_resolutions = resolveField(this.scope, call_stmt.callee);
        if (func_resolutions !== null) {//TODO: all, not just first
            let called_func = func_resolutions.possibilities[0];
            if (called_func instanceof AnalysisDBUpdate) {
                let to_node = cg.get_external_node("stream", call_stmt.params[0].properties["TableName"].value)[0];//TODO: more robust way to do this
                cg.add_edge(new GraphEdge(this.coming_from, to_node))
            } else if (called_func instanceof AnalysisDBRead) {
                let to_node = this.coming_from;
                let from_node = cg.get_external_node("stream", call_stmt.params[0].properties["TableName"].value)[0];//TODO: see line for AnalysisDBUpdate
                cg.add_edge(new GraphEdge(from_node, to_node));
            }//if it's a special call with implicit flow
            else if(called_func instanceof AnalysisOutgoingEmail) {
                let to_node = cg.get_external_node("email", "");
                if (to_node.length === 0) {
                    to_node = new GraphNode("email", "Outgoing Email", false);
                    cg.add_node(to_node);
                } else to_node = to_node[0];
               cg.add_edge(new GraphEdge(this.coming_from, to_node));
            }//
            else {
                if (this.coming_from) {
                    cg.add_edge(new GraphEdge(this.coming_from, called_func.node));
                    cg.add_node(called_func.node);
                }//if we're not in global scope when making this call
                this.exec_func(called_func);
            }//if it is a normal function call
        }//if the function can be resolved
        else {
            console.log(`Warning: Cannot resolve function: ${call_stmt.callee.name}`)
        }
    }//visitFuncCall

    exec_func(called_func) {
        let stack_frame = this.coming_from;
        let stack_scope = this.AnalysisScope;
        this.AnalysisScope = new AnalysisScope(this.AnalysisScope);
        this.coming_from = called_func.node;
        called_func.exec(this);
        this.AnalysisScope = stack_scope;
        this.coming_from = stack_frame;
    }
}//CallGraphVisitor

module.exports = {
    CallGraphVisitor: CallgraphVisitor
};