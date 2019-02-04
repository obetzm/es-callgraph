
let {GraphNode,GraphEdge,CallGraph} = require("./call_graph.js");

class AnalysisScope {
    constructor(parent_scope){
        this.parent_scope = (parent_scope === undefined || parent_scope === null)
                                ? this.parent_scope = AnalysisScope.OutOfScope : parent_scope;
        this.declarations = {}
    };
    static getTopLevelScope() {
        if (AnalysisScope.OutOfScope) return AnalysisScope.OutOfScope;
        let top_scope = new AnalysisScope(null, null);
        top_scope.parent_scope = top_scope;
        return top_scope;
    }
    set(name, value) {
        if (name.indexOf(".")>-1) {
            let parts = name.split(".");
            let target_obj;
            try { target_obj = this.find(parts[0]); }
            catch(e) {
                target_obj = new AnalysisObject();
                this.declarations[parts[0]] = target_obj;
            }
            target_obj.set(parts.slice(1).join("."), value);
        }
        else this.declarations[name] = value;
    }
    find(name) {
        if (this === AnalysisScope.OutOfScope ) { return null; }
        if (name && name.indexOf(".")>-1) {
            let parts = name.split(".");
            let first_obj = this.declarations[parts[0]] || this.parent_scope.find(parts[0]);

            return first_obj.find(parts.slice(1).join("."));
        }
        return this.declarations[name] || this.parent_scope.find(name);
    }

}//class AnalysisScope
AnalysisScope.OutOfScope = AnalysisScope.getTopLevelScope();

class AnalysisFunc {//TODO: this needs to store delcared scope
    constructor(name, tree, node, scope) {
        this.name = name;
        this.tree = tree;
        this.node = node; //TODO: parameter values, this
        this.scope = scope;
    }
    clone() { return this; }
}

/*
class DatabaseHandle {
    constructor() {}
    find(operation) {
        if ( operation === "update" ) {
            return new DatabaseUpdateFunc();
        }
    }
}

class DatabaseUpdateFunc {
    constructor() {}
    setUpdateParams(v) {
        this.params = v; //TODO: make V an AnalysisObject that's been processed already, e.g identifier points to variable in scope
        this.table_name = v.properties[0].value.value;
    }

}
*/

class AnalysisValue {
    constructor(init) { this.possibilities = []; if (init) { this.add(init); }}
    add(possibility) { this.possibilities.push(possibility); }
    clone() { return this.possibilities.reduce((a,n) => a.add(n), new AnalysisValue()); }
}
/*
class AnalysisLiteral {
    constructor(val) { this.val = val; }
    clone() { return this; } //literals are constant
}

class AnalysisImport {
    constructor(path) { this.path = path; }
    clone() { return this; }
    find(key) {
        if (this.path==="aws-sdk" && key === "DynamoDB.DocumentClient") return new DatabaseHandle();
        else return this;
    }
}
*/
class AnalysisObject {
    constructor() { this.fields = {}; }
    set(key, val) {
        let dotIndex = key.indexOf(".");
        let field = key.substr(0,dotIndex);
        let target;
        if (dotIndex>-1) {
            try { target = this.find(field); }
            catch(e) {
                target = new AnalysisObject();
                this.fields[field] = target;
            }
            target.set(key.substr(dotIndex + 1), val);
        }
        else this.fields[key] = val;
    }
    find(key) {
        let dotIndex = key.indexOf(".");
        if (dotIndex>-1) { return this.fields[key.substr(0,dotIndex)].find(key.substr(dotIndex+1))}
        if (this.fields[key] !== undefined) return this.fields[key];
        throw new Error(`Attempted to access undefined field ${key}`);
    }
    clone() { return this; /*objects are passed by ref*/}
}
/*
function exec_fn(call_expr, scope) {
    let fn_name_parts = unroll_memberexpr(call_expr.callee);
    let fn = scope.find(fn_name_parts);
    if ( fn instanceof AnalysisFunc ) {
        let edge = new GraphEdge(scope.graph_rep, fn.node);
        CallGraph.instance.add_edge(edge);
        return walk_ast(fn.tree.body, scope.graph_rep, new AnalysisScope(fn.node, fn.scope));
    }
    else if ( fn instanceof DatabaseHandle ) {
        return fn;
    }
    else if ( fn instanceof DatabaseUpdateFunc ) {
        fn.setUpdateParams(call_expr.arguments[0]); //TODO: what if this is an identifier, parse arguments
        let dbcall = new GraphNode("database", "dynamodb." + fn.table_name, false, null); //TODO: what does this look like in serverless.yml
        CallGraph.instance.add_node(dbcall);
        let edge = new GraphEdge(scope.graph_rep, dbcall);
        CallGraph.instance.add_edge(edge);
        return null;
    }
    else {
        throw new Error(`Tried to call a non-function as a function: ${fn_name_parts}`);
    }

}

let unroll_memberexpr = (expr) => expr.type === "MemberExpression" ? `${unroll_memberexpr(expr.object)}.${unroll_memberexpr(expr.property)}` : expr.name;

function parse_assignment(lhs, rhs, scope) {
    let key,val;
    //RHS
    if (rhs.type === "Literal") {
        val = new AnalysisLiteral(rhs.raw);
    }
    else if (rhs.type === "Identifier") {
        val = scope.find(rhs.name).clone();
    }
    else if (rhs.type === "CallExpression") {
        if (rhs.callee && rhs.callee.name === "require") val = new AnalysisImport(rhs.arguments[0].value);
        else val = exec_fn(rhs, scope);
    }
    else if (rhs.type === "ObjectExpression") {//TODO: do this better
        val = new AnalysisObject();
        rhs.properties.forEach((p) => {
                if (p.value.type === "Identifier") {
                    val.set(p.key.name, scope.find(p.value.name));
                }
                else throw new Error(`not yet supported assignment to object field ${p.key.name} of type ${p.value.type}`);
            }
        )
    }
    else throw new Error(`not yet supported assignment type to ${key}: ${rhs.type}`);


    //LHS
    if (lhs.type === "Identifier") {
        scope.set(lhs.name, val);
    }
    else if (lhs.type === "MemberExpression") {
        scope.set(unroll_memberexpr(lhs), val);
    }
    else throw new Error(`Unsupported assignment to ${JSON.stringify(lhs)}`);
}

function declare_implicit_globals(scope) {
    scope.set("module", new AnalysisObject());
}


function walk_ast(ast, node_rep, scope) {
    let cg = CallGraph.instance;
    let retval;
    if (ast.type === "Program") {//NOTE: assuming we only hit this at top of file, dangerous?
        let program_scope = new AnalysisScope(node_rep, AnalysisScope.OutOfScope);
        declare_implicit_globals(program_scope);
        ast.body.forEach((stmt) => walk_ast(stmt, node_rep, program_scope));
        let main_fn_name = node_rep.label;
        let exports = program_scope.find("module.exports");
        let main_fn = exports.find(main_fn_name);
        cg.merge_nodes(node_rep, main_fn.node);
        walk_ast(main_fn.tree.body, node_rep, program_scope);
    }
    else if (ast.type === "FunctionDeclaration" && ast.id.name !== undefined ) {
        let found_method = new GraphNode("lambda", ast.id.name, false, node_rep);
        cg.add_node(found_method);
        scope.set(ast.id.name, new AnalysisFunc(ast.id.name, ast, found_method, scope));
    }
    else if (ast.type === "FunctionExpression" && ast.id.name !== undefined && ast.id.name !== null) {
        let found_method = new GraphNode("lambda", ast.id.name, false, node_rep);
        cg.add_node(found_method);
        scope.set(ast.id.name, new AnalysisFunc(ast.id.name, ast, found_method, scope));
    }
    else if (ast.type === "BlockStatement") {
        let block_scope = new AnalysisScope(node_rep, scope);
        ast.body.forEach((stmt) => walk_ast(stmt, node_rep, block_scope));
    }
    else if (ast.type === "ExpressionStatement") {
        walk_ast(ast.expression, node_rep, scope);
    }
    else if (ast.type === "VariableDeclaration") {
        ast.declarations.forEach((decl) => {
            parse_assignment(decl.id, decl.init, scope);
        });
    }
    else if (ast.type === "AssignmentExpression") {
        parse_assignment(ast.left, ast.right, scope);
    }
    else if (ast.type === "CallExpression") {
        exec_fn(ast, scope);//TODO: recursion will cause infinite recursion...
    }


    return retval;
}*/

module.exports = {
    AnalysisValue: AnalysisValue,
    AnalysisScope: AnalysisScope
};