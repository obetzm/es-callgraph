
let {GraphNode,GraphEdge,CallGraph} = require("./call_graph.js");

class AnalysisScope {
    constructor(representing_node, parent_scope){
        this.graph_rep = representing_node;
        if (parent_scope === undefined || parent_scope === null) {
            this.parent_scope = AnalysisScope.OutOfScope;
        }
        this.declarations = {}
    };
    static getTopLevelScope() {
        if (AnalysisScope.OutOfScope) return AnalysisScope.OutOfScope;
        let top_scope = new AnalysisScope(null, null);
        top_scope.parent_scope = top_scope;
        return top_scope;
    }
    set(name, value) {this.declarations[name] = value;}
    find(name) {
        if (this === AnalysisScope.OutOfScope ) { throw new Error(`Attempted to find '${name}', but not in scope`); }
        return this.declarations[name] || this.parent_scope.find(name);
    }

}//class AnalysisScope
AnalysisScope.OutOfScope = AnalysisScope.getTopLevelScope();

class AnalysisFunc {
    constructor(name, tree, node) {
        this.name = name;
        this.tree = tree;
        this.node = node; //TODO: parameter values, this
    }
    clone() { return this; }
}

class AnalysisValue {
    constructor() { this.possibilities = []; }
    add(possibility) { this.possibilities.push(possibility); }
    clone() { return this.possibilities.reduce((a,n) => a.add(n), new AnalysisValue()); }
}

class AnalysisLiteral {
    constructor(val) { this.val = val; }
    clone() { return this; } //literals are constant
}

class AnalysisImport {
    constructor(path) { this.path = path; }
    clone() { return this; }
}

function exec_fn(call_expr, scope) {
    let fn_name = unroll_memberexpr(call_expr.callee);
    let fn = scope.find(fn_name);
    let edge = new GraphEdge(scope.graph_rep, fn.node);
    new CallGraph().add_edge(e);
    let fn_scope = new AnalysisScope(scope.graph_rep, scope);
    return walk_ast(fn.tree.body, scope.graph_rep, fn_scope);
}

let unroll_memberexpr = (expr) => expr.type === "MemberExpression" ? `${expr.object.name}.${unroll_memberexpr(expr.property)}` : expr.name;

function parse_assignment(lhs, rhs, scope) {
    let key,val;
    //LHS
    if (lhs.type === "Identifier") {
        key=lhs.name;
    }
    else if (lhs.type === "MemberExpression") {
        key = unroll_memberexpr(lhs);
    }
    else throw new Error(`Unsupported assignment to ${JSON.stringify(lhs)}`);

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
    else {
        throw new Error(`not yet supported assignment type to ${key}: ${rhs.type}`)
    }
    return [key, val]
}

function walk_ast(ast, node_rep, scope) {
    let cg = new CallGraph();
    let retval;

    console.log("===============\n");
    console.log(JSON.stringify(ast, null, 2));
    console.log("===============\n");
    if (ast.type === "Program") {
        let program_scope = new AnalysisScope(node_rep, scope);
        ast.body.forEach((stmt) => walk_ast(stmt, node_rep, program_scope))
    }
    else if (ast.type === "FunctionExpression" && id.name !== undefined && id.name !== null) {
        let found_method = new GraphNode("lambda", id.name, false, node_rep);
        cg.add_node(found_method);
        scope.set(id.name, new AnalysisFunc(id.name, ast, found_method));
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
            let [key,val] = parse_assignment(decl.id, decl.init, scope);
            scope.set(key, val);
        });
    }
    else if (ast.type === "AssignmentExpression") {
        let [key,val] = parse_assignment(ast.left, ast.right, scope);
        scope.set(key, val);
    }

    return retval;
}

module.exports = {
    walk_ast: walk_ast
};