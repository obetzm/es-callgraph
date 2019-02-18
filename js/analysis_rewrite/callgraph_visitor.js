let {CallGraph,GraphNode,GraphEdge} = require("../call_graph");
let {FunctionNode,FieldAccessNode,VariableNode, FuncCallNode, ObjectNode, NewNode, LiteralNode} = require("./prime_tree");
let {AbstractVisitor} = require("./abstract_visitor");
let {AnalysisScope, AnalysisValue} = require("../call_graph_analysis");

let fs = require("fs");
let parser = require("esprima");
let {rewrite_ast} = require("./prime_tree");

class AnalysisAmazonNode extends ObjectNode {
    constructor () {
        super("", []);
    }
    find(property) {
        return (property === "DynamoDB") ? new AnalysisValue(new AnalysisDynamoNode()) :
            (property === "SES") ? new AnalysisValue(new AnalysisEmailerNode()) :
                (property === "S3") ? new AnalysisValue(new AnalysisS3Node()) : null;
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

class AnalysisS3Node extends ObjectNode {
    constructor () {
        super("", []);
    }
    find(property) {
        if (property === "getObject" || property === "listObjectsV2") return new AnalysisValue(new AnalysisS3ReadNode());
            else if (property === "putObject") return new AnalysisValue(new AnalysisS3WriteNode());
                else if (property === "copyObject") return new AnalysisValue(new AnalysisS3CopyNode());
    }
}

class AnalysisS3ReadNode {
    constructor() {}
    exec(params) {}
}
class AnalysisS3WriteNode {
    constructor() {}
    exec(params) {}
}
class AnalysisS3CopyNode {
    constructor() {}
    exec(params) {}
}

class AnalysisDBClientNode extends ObjectNode {
    constructor () {
        super("", []);
        console.log("Spawning a Client Node");
    }
    find(property) {
             if (property === "update" || property === "put") return new AnalysisValue(new AnalysisDBUpdate());
        else if (property === "scan" || property === "get") return new AnalysisValue(new AnalysisDBRead());
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
        if (parent_obj === null ) return null;
        else if (parent_obj instanceof AnalysisValue) {
            if (parent_obj.possibilities && parent_obj.possibilities.length === 0) { console.log(`Warning: resolved ${access_node.obj.name}, but unable to determine possible refs.`); return null; }
            else return parent_obj.possibilities.reduce((a, n) => a.concat(n.find(access_node.field.name)), new AnalysisValue());
        } else throw new Error("Warning: Field Access Node cannot be resolved.")
    } else if (access_node instanceof FuncCallNode) {
        let inner_func = resolveField(scope, access_node.callee);//TODO: need access to exec_func here
        console.log("Warning: Chained function calls not currently supported.");
        return null;
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
                if (assgn_stmt instanceof ObjectNode) {
                    let entry_func = assgn_stmt.rhs.properties[entry_method_name];
                    if (entry_func instanceof FunctionNode) {
                        CallGraph.instance.merge_nodes(this.entrypoints[0], entry_func.node);
                        entry_func.node = this.entrypoints[0]; //TODO: this is unsafe if more than one function holds a ref
                        entry_func.scope = this.scope;
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
                }//if the assigned export is an object
                this.scope.set("exports", assgn_stmt.rhs);
            }//if the assignment is to module.exports
            else if (assgn_stmt.lhs.obj.name === "exports") {
                let entry_method_name = this.entrypoints[0].label;
                let func_name = assgn_stmt.lhs.field.name;
                if (func_name === entry_method_name) {
                    let entry_func = assgn_stmt.rhs;
                    if (entry_func instanceof VariableNode) {
                        entry_func = this.scope.find(entry_func.name);
                    }
                    CallGraph.instance.merge_nodes(this.entrypoints[0], entry_func.node);
                    entry_func.node = this.entrypoints[0]; //TODO: this is unsafe if more than one function holds a ref
                    entry_func.scope = this.scope;
                    this.exec_func(entry_func);
                }//if the thing assigned to exports is the entry method
                let export_obj = this.scope.find("exports");
                if (export_obj === null) {
                    export_obj = new AnalysisValue(new ObjectNode(assgn_stmt.group, []));
                    this.scope.set("exports", export_obj);
                }
                assgn_stmt.rhs.scope = this.scope;
                export_obj.possibilities[0].properties[assgn_stmt.lhs.field.name] = assgn_stmt.rhs;
                assgn_stmt.rhs.node.label = assgn_stmt.rhs.node.label || assgn_stmt.lhs.field.name;

            }//if the assignment is to exports.VARNAME
        }//if the assignment is a field write


        else if (assgn_stmt.rhs instanceof FunctionNode) {
            assgn_stmt.rhs.scope = this.scope;
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
                else if (assgn_stmt.rhs.params[0].value.startsWith(".")) {
                    console.log("FOUND LOCAL LIBRARY: " + assgn_stmt.rhs.params[0].value);
                    let current_path = this.entrypoints[0].context.split("/");
                    current_path.pop();
                    current_path = current_path.concat(this.entrypoints[0].file.split("/"));
                    current_path.pop();
                    let
                        import_path = assgn_stmt.rhs.params[0].value.split("/");
                    while (import_path[0] === "..") {
                        import_path.shift();
                        current_path.pop();
                    }
                    current_path = current_path.concat(import_path);
                    let target_path = current_path.join("/") + ".js";

                    let entry_file = fs.readFileSync(target_path, 'utf8');
                    let import_ast = parser.parseModule(entry_file);
                    let lhs_func = new GraphNode("lambda", assgn_stmt.lhs.name, true, assgn_stmt.group);
                    lhs_func.set_context('.', target_path);
                    let CGA = new CallgraphVisitor([lhs_func]);
                    let visitor_import_ast = rewrite_ast(import_ast, assgn_stmt.group);
                    visitor_import_ast.apply(CGA);
                    let lib_exports = CGA.scope.find("exports");
                    if (assgn_stmt.lhs.name) {
                        this.scope.set(assgn_stmt.lhs.name, lib_exports);
                    } else if (assgn_stmt.lhs instanceof ObjectNode) {
                        Object.keys(assgn_stmt.lhs.properties).forEach((req) => {
                            let assignment = lib_exports.possibilities[0].find(req);
                            this.scope.set(req, new AnalysisValue(assignment));
                        })
                    }else {
                        console.log(assgn_stmt.lhs);
                        throw new Error("Require used with unsupported assignment expression.")
                    }
                }
            }//if require
            else {//NOTE: this is necessary to store dynamo.update, but should eventually store all values
                let resolved_func = resolveField(this.scope, assgn_stmt.rhs.callee);
                this.scope.set(assgn_stmt.lhs.name, resolved_func);
            }
        } else if (assgn_stmt.rhs instanceof NewNode ) {//if we're storing the result of an object initialization
            let resolved_func = resolveField(this.scope, assgn_stmt.rhs.initialized);
            this.scope.set(assgn_stmt.lhs.name, resolved_func);
        } else if (assgn_stmt.rhs instanceof FieldAccessNode) {
            if (assgn_stmt.rhs.obj.obj && assgn_stmt.rhs.obj.obj.name === "process" && assgn_stmt.rhs.obj.field.name === "env") {
                this.scope.set(assgn_stmt.lhs.name, new AnalysisValue(new LiteralNode(assgn_stmt.group, "ENV_" + assgn_stmt.rhs.field.name)));
            }//TODO: field reference assigned to variable
        } else if (!(assgn_stmt.rhs instanceof VariableNode || assgn_stmt.rhs instanceof FieldAccessNode)) {
            this.scope.set(assgn_stmt.lhs.name, new AnalysisValue(assgn_stmt.rhs));
        }//TODO: assign variable to another variable

    }//visitAssignment

    visitFunctionDeclaration(func_stmt) {
        if (func_stmt.name) {
            let lhs = func_stmt.name;
            if (this.scope.find(lhs)) {
                this.scope.find(lhs).add(func_stmt);
            } else this.scope.set(lhs, new AnalysisValue(func_stmt));
        }
        func_stmt.scope = this.scope;
    }

    visitFuncCall(call_stmt) {
        let cg = CallGraph.instance;
        let func_resolutions = resolveField(this.scope, call_stmt.callee);
        if (call_stmt.callee.name === "promise") {
            console.log(call_stmt);
            console.log(func_resolutions);
        }
        if (func_resolutions !== null && func_resolutions.possibilities.length > 0) {
            let called_func = func_resolutions.possibilities[0];//TODO: all, not just first
            if (called_func instanceof AnalysisDBUpdate) {
                let config_obj = call_stmt.params[0];
                if (config_obj instanceof VariableNode) config_obj = this.scope.find(config_obj.name).possibilities[0];
                let table_name = config_obj.properties["TableName"];
                if (table_name instanceof VariableNode) table_name = this.scope.find(table_name.name).possibilities[0].value;
                let to_node = cg.find_or_create_dynamo_node(table_name);//TODO: more robust way to do this
                cg.add_edge(new GraphEdge(this.coming_from, to_node));
                call_stmt.params[1].exec(this);//TODO: when func is a ref
            } else if (called_func instanceof AnalysisDBRead) {
                let to_node = this.coming_from;
                let config_obj = call_stmt.params[0];
                if (config_obj instanceof VariableNode) config_obj = this.scope.find(config_obj.name).possibilities[0];
                let table_name = config_obj.properties["TableName"];
                if (table_name instanceof VariableNode) table_name = this.scope.find(table_name.name).possibilities[0].value;
                let from_node = cg.find_or_create_dynamo_node(table_name);//TODO: same problem as AnalysisDBUpdate
                cg.add_edge(new GraphEdge(from_node, to_node, "dashed"));
                call_stmt.params[1].exec(this);//TODO: when func is a ref
            }
            else if (called_func instanceof AnalysisOutgoingEmail) {
                let to_node = cg.get_external_node("email", "");
                if (to_node.length === 0) {
                    to_node = new GraphNode("email", "Outgoing Email", false);
                    cg.add_node(to_node);
                } else to_node = to_node[0];
                cg.add_edge(new GraphEdge(this.coming_from, to_node));
            }//
            else if (called_func instanceof AnalysisS3ReadNode) {
                let to_node = this.coming_from;
                let config_obj = call_stmt.params[0];
                if (config_obj instanceof VariableNode) config_obj = this.scope.find(config_obj.name).possibilities[0];
                let bucket_name = config_obj.properties["Bucket"];
                if (bucket_name instanceof VariableNode) bucket_name = this.scope.find(bucket_name.name).possibilities[0].value;
                let from_node = cg.find_or_create_s3_node(bucket_name);//TODO: same problem as AnalysisDBUpdate
                cg.add_edge(new GraphEdge(from_node, to_node, "dashed"));
                call_stmt.params[1].exec(this);//TODO: when func is a ref
            }
            else if (called_func instanceof AnalysisS3WriteNode) {
                let config_obj = call_stmt.params[0];
                if (config_obj instanceof VariableNode) config_obj = this.scope.find(config_obj.name).possibilities[0];
                let bucket_name = config_obj.properties["Bucket"];
                if (bucket_name instanceof VariableNode) bucket_name = this.scope.find(bucket_name.name).possibilities[0].value;
                let to_node = cg.find_or_create_s3_node(bucket_name);//TODO: same problem as AnalysisDBUpdate
                cg.add_edge(new GraphEdge(this.coming_from, to_node));
                call_stmt.params[1].exec(this);//TODO: when func is a ref
            }
            else if (called_func instanceof AnalysisS3CopyNode) {
                //TODO S3 copies
            }
            else {
                if (this.coming_from) {
                    cg.add_edge(new GraphEdge(this.coming_from, called_func.node));
                    cg.add_node(called_func.node);
                }//if we're not in global scope when making this call
                this.exec_func(called_func);
            }//if it is a normal function call
        }//if the function can be resolved
        else if (call_stmt.callee instanceof FieldAccessNode) {
            if (call_stmt.callee.field.name && call_stmt.callee.field.name === "forEach") {
                call_stmt.params[0].exec(this); //TODO: when func is a ref
            }//TODO: consider remaining function calls
        }
        else {
            console.log(`Warning: Cannot resolve function: ${call_stmt.callee.name}`)
        }
    }//visitFuncCall

    exec_func(called_func) {
        let stack_frame = this.coming_from;
        let stack_scope = this.scope;
        this.scope = new AnalysisScope(called_func.scope);
        this.coming_from = called_func.node;
        called_func.exec(this);
        this.scope = stack_scope;
        this.coming_from = stack_frame;
    }
}//CallGraphVisitor

module.exports = {
    CallGraphVisitor: CallgraphVisitor
};