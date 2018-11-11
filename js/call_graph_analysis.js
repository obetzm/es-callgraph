
let {GraphNode,GraphEdge,CallGraph} = require("./call_graph.js");

class AnalysisScope {
    constructor(representing_node, parent_scope){
        this.graph_rep = representing_node;
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
    set(name, value) {this.declarations[name] = value;}
    find(name) {
        if (this === AnalysisScope.OutOfScope ) { throw new Error(`Attempted to find '${name}', but not in scope`); }
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

class AnalysisObject {
    constructor() { this.fields = {}; }
    set(key, val) { this.fields[key] = val; }
    find(key) {
        if (this.fields[key] !== undefined) return this.fields[key];
        throw new Error(`Attmpted to access undefined field ${key}`);
    }
    clone() { return this; /*objects are passed by ref*/}
}

function exec_fn(call_expr, scope) {
    let fn_name_parts = unroll_memberexpr(call_expr.callee);

    let fn = scope.find(fn_name_parts);
    let edge = new GraphEdge(scope.graph_rep, fn.node);
    CallGraph.instance.add_edge(edge);
    return walk_ast(fn.tree.body, scope.graph_rep, fn.scope);
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
        parse_assignment()
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
        console.log(ast);
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
}

module.exports = {
    walk_ast: walk_ast
};