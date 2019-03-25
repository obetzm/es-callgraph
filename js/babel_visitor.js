
let {GraphNode, GraphEdge, CallGraph} = require("./call_graph");
let path = require("path");
let babel = require("@babel/core");
let traverse = require("@babel/traverse");

let libraries = {
    "aws-sdk": {
        "DynamoDB": {
            "DocumentClient": {
                "update": {},
                "put": {},
                "scan": {},
                "get": {}
            }
        },
        "SES": {
            "sendEmail": {}
        },
        "S3": {
            "getObject": {},
            "listObjectsV2": {},
            "putObject": {},
            "copyObject": {},
        }
    }
};

function resolve(state, target) {
    let notFound = true;
    let i = state.length - 1;
    let resolution = undefined;
    while (notFound && i > -1) {
        resolution = state[i].scope[target];
        notFound = resolution === undefined;
        --i
    }
    return resolution;
}

function exprToString(member_expr) {
    let field_stack = [];
    while (member_expr.type === "MemberExpression") {
        field_stack.push(member_expr.property.name);
        member_expr = member_expr.object;
    }
    field_stack.push(member_expr.name);
    return field_stack.reverse().join(".")
}

function memberResolution(state, member_expr) {
    let field_stack = [];
    let leftmost = member_expr;
    while (leftmost !== undefined && leftmost.type === "MemberExpression") {
        field_stack.push(leftmost.property);
        leftmost = leftmost.object;
    }
    let target = resolve(state, leftmost.name);
    while (field_stack.length > 1 && target !== undefined) {
        let next_to_resolve = field_stack.pop();
        target = target[next_to_resolve.name]
        //TODO: if computed true
    }
    return target;
}

function resolveFunction(state, call_expr) {
    let callee = call_expr.callee;
    let called_func;

    if ( callee.type === "MemberExpression" ) {
        called_func = memberResolution(state, callee);
    }
    else if (callee.type === "Identifier" ){
        called_func = resolve(state, callee.name);
    }
    else { throw new Error("Cannot determine call type for: " + JSON.stringify(callee)) }
    return called_func;
}

function callFunction(state, path) {
    let callee = path.node.callee;
    let called_func = resolveFunction(state, path.node);

    if ( called_func === undefined ) {
        console.log("Warning: Cannot resolve call of: " + exprToString(callee));
    }
    else if (called_func instanceof GraphNode ) {
        let enclosing_scope = path.getFunctionParent();
        let enclosing_node = CallGraph.instance.find_node_by_babel_ref(enclosing_scope.node);
        if (enclosing_scope === undefined || enclosing_node === undefined ) {
            console.log("Warning: cannot determine the function which called " + exprToString(callee))
        }
        else {
            let call_edge = new GraphEdge(enclosing_node, called_func);
            CallGraph.instance.add_edge(call_edge);
        }
    } else {
        console.log("Warning: attempted to call something that doesn't appear to be a function: " + exprToString(callee));
    }
}

function defineFunction(name, group, node) {
    let this_func = new GraphNode("lambda", name, false, group, node, group);
    CallGraph.instance.add_node(this_func);
    return this_func;
}

function performImport(state, call_expr) {
    let returned_obj;
    let import_path = call_expr.arguments[0].value;
    if (import_path.startsWith("./")) { //local import
        let current_filepath = state[0].id.split(path.sep);
        current_filepath.pop();
        import_path = import_path.split('/');
        import_path.shift();
        let import_location = current_filepath.concat(import_path).join("/");
        let import_ast = babel.transformFileSync(import_location, {
            ast: true, presets: [
                ["@babel/preset-env",
                    {"targets": {"ie": "9"}}]
            ]
        });

        let import_id = import_ast.options.filename.replace(import_ast.options.cwd, '.');
        let import_scope = [{id: import_id, scope: {"exports": {}}}];
        traverse.default(import_ast.ast, module.exports, undefined, import_scope);
        console.log("Imported file " + import_id);
        returned_obj = import_scope[0].scope.exports;

    }
    else if (Object.keys(libraries).includes(import_path)) {
        returned_obj = libraries[import_path];
    }
    else {
        console.log("Ignoring non-local library: " + import_path);
    }
    return returned_obj;
}//performImport

function performAssignment(state, left, right) {
    let assignee;
    let name;
    if (left.type === "Identifier") {
        assignee = state[state.length-1].scope;
        name = left.name;
    }
    else if (left.type === "MemberExpression") {
        if (left.object.name === "module" && left.property.name === "exports") {
            assignee = state[0].scope;
            name = "exports"
        }
        else {
            assignee = memberResolution(state, left);
            name = left.property.name;
        }
    }
    else {
        throw new Error(`Unhandled Assignment TO (${left.type})`)
    }

    if ( !assignee ) {
        console.log("Warning: cannot determine assignment target for: " + JSON.stringify(left));
    }
    else if (right === null) {
        assignee[name] = null;
    }
    else if (right.type === "Identifier") {
        assignee[name] = resolve(state, right.name);
    }
    else if (right.type === "FunctionExpression") {
        assignee[name] = defineFunction(name, state[0].id, right)
    }
    else if (right.type === "CallExpression") {
        if (right.callee.name === "require") {
            assignee[name] = performImport(state, right);
        }
        else {
            let called_func = resolveFunction(state, right);

            if (called_func instanceof GraphNode) {
                //TODO: returns flow to lhs, and a function handle could be returned. Making the edge is handled in CallExpression visitor
            }
            else { //if the call was to a placeholder (like a library)
                assignee[name] = called_func;
            }
        }
    }
    else if (right.type === "MemberExpression") {
        //TODO: resolve object, then resolve field
    }
    else if (right.type === "NewExpression") {
        if (right.callee.type === "MemberExpression") {
            let called_func = memberResolution(state, right.callee);
            assignee[name] = called_func;
        }
        else if (right.callee.type === "Identifier") {
            //TODO: to properly handle this. {} created, flows to 'this' of target, is assigned to left.
        }
    }
    else if (right.type === "ArrayExpression") {

    }
    else if (right.type === "ConditionalExpression") {

    }
    else if (right.type === "BinaryExpression") {

    }
    else if (right.type === "NumericLiteral") {
        assignee[name] = right;
    }
    else if (right.type === "StringLiteral") {
        assignee[name] = right;
    }
    else if (right.type === "ObjectExpression") {
        let constructed_object = {};
        right.properties.forEach((property) => {
            //TODO: if value is an identifier, do lookup
            let val = property.value;
            if (val.type === "Identifier") {
                val = resolve(state, val.name);
            }
            else if ( val.type === "FunctionExpression" ) {
                val = defineFunction(val.id.name, state[0].id, val)
            }
            //TODO: if key is computed, do lookup
            constructed_object[property.key.name] = val;
        });
        assignee[name] = constructed_object;
    }
    else {
        throw new Error(`Unhandled Assignment FROM: ${right.type}`)
    }
}


module.exports = {
    /* Functions of the form: function name(args...) { }*/
    FunctionDeclaration(path, state) {
        let func_name = path.node.id.name;
        console.log("At: " + func_name);
        state[state.length-1].scope[func_name] = defineFunction(func_name, state[0].id, path.node)
    },

    /* Entering and leaving blocks */
    BlockStatement: {
      enter(path, state) {
          state.push({id: path.scope.uid, scope: {}})
      },
      exit(path, state) {
          state.pop()
      }
    },

    VariableDeclaration(path, state) {
        path.node.declarations.forEach((decl) => {
            performAssignment(state, decl.id, decl.init);
        })
    },

    AssignmentExpression(path, state) {
        performAssignment(state, path.node.left, path.node.right)
    },

    /* call sites */
    CallExpression(path, state) {
        callFunction(state, path)
    }
};