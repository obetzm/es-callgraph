
let {GraphNode, GraphEdge, CallGraph} = require("./call_graph");
let path = require("path");
let babel = require("@babel/core");
let traverse = require("@babel/traverse");

let declaration_constraints = [];
let assignment_constraints = [];
let call_constraints = [];
let scope_ancestries = [];


function process_dynamo_write(state, from_func, call_expr) {
    let config_obj = call_expr.arguments[0];
    let prepared_obj;
    if (config_obj.type === "Identifier") prepared_obj = resolve(state, config_obj.name);
    else if (config_obj.type === "ObjectExpression") prepared_obj = process_object(state, config_obj);
    else throw new Error("unknown parameter passed into Serverless event trigger.");

    console.log(prepared_obj);

    let table_name = prepared_obj["TableName"];
    if (table_name.type === "Identifier") table_name = resolve(state, table_name.name);
    if (table_name.type === "StringLiteral") table_name = table_name.value;

    let to_node = CallGraph.instance.find_or_create_dynamo_node(table_name);//TODO: more robust way to do this
    CallGraph.instance.add_edge(new GraphEdge(from_func, to_node));
}

function process_dynamo_read(state, from_func, call_expr) {
    let config_obj = call_expr.arguments[0];
    let prepared_obj;
    if (config_obj.type === "Identifier") prepared_obj = resolve(state, config_obj.name);
    else if (config_obj.type === "ObjectExpression") prepared_obj = process_object(state, config_obj);
    else throw new Error("unknown parameter passed into Serverless event trigger.");

    console.log(prepared_obj);

    let table_name = prepared_obj["TableName"];
    if (table_name.type === "Identifier") table_name = resolve(state, table_name.name);
    if (table_name.type === "StringLiteral") table_name = table_name.value;

    let to_node = CallGraph.instance.find_or_create_dynamo_node(table_name);//TODO: more robust way to do this
    CallGraph.instance.add_edge(new GraphEdge(to_node, from_func, "dotted"));
}

function process_graphql(state, from_func, call_expr) {
    let schema = call_expr.arguments[0];
    let query_obj = schema["query"];
    console.log(query_obj);

}

let libraries = {
    "aws-sdk": {
        "DynamoDB": {
            "DocumentClient": {
                "update": process_dynamo_write,
                "put": process_dynamo_write,
                "scan": process_dynamo_read,
                "get": process_dynamo_read
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
    },
    "graphql": {
        "graphql": process_graphql
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

function findScopeOf(state, target) {
    let targetExistsIn = false;
    let i = state.length - 1;
    let scope = state;
    while ( !targetExistsIn && i > -1) {
        scope = state[i].scope;
        targetExistsIn = scope.hasOwnProperty(target);
        --i
    }
    return (targetExistsIn) ? scope : undefined;
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

function memberResolution(state, member_expr, is_lhs) {
    let field_stack = [];
    let leftmost = member_expr;
    while (leftmost !== undefined && leftmost.type === "MemberExpression") {
        field_stack.push(leftmost.property);
        leftmost = leftmost.object;
    }
    let target = resolve(state, leftmost.name);
    let stopping_point = (is_lhs) ? 1 : 0;
    while (field_stack.length > stopping_point && target !== undefined && target !== null) {
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

    let enclosing_scope = path.getFunctionParent();
    let enclosing_node;
    if (enclosing_scope) {
        enclosing_node = CallGraph.instance.find_node_by_babel_ref(enclosing_scope.node);
    }

    if ( called_func === undefined ) {
        console.log("Warning: Cannot resolve call of: " + exprToString(callee));
    }
    else if (called_func instanceof GraphNode) {
        if (enclosing_node === undefined ) {
            console.log("Warning: cannot determine the function which called " + exprToString(callee))
        }
        else {
            let call_edge = new GraphEdge(enclosing_node, called_func);
            CallGraph.instance.add_edge(call_edge);
        }
    } else if ((typeof called_func) === "function") {
        called_func(state, enclosing_node, path.node)
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
    if (import_path.startsWith(".")) { //local import
        let current_filepath = state[0].id.split(path.sep);
        current_filepath.pop(); //remove file at end of current filepath
        import_path = import_path.split('/');
        while (import_path[0] === "..") {
            import_path.shift();
            current_filepath.pop();
        }
        if (import_path[0] === ".") import_path.shift();
        if (import_path[import_path.length-1].indexOf(".") === -1 ) import_path[import_path.length-1] = import_path[import_path.length-1] + ".js";
        let import_location = current_filepath.concat(import_path).join("/");
        console.log("Importing file: " + import_location);
        let import_ast = babel.transformFileSync(import_location, {
            ast: true, presets: [
                ["@babel/preset-env",
                    {"targets": {"ie": "9"}}]
            ]
        });

        let import_id = import_ast.options.filename.replace(import_ast.options.cwd, '.');
        let import_scope = [{id: import_id, scope: {"exports": {}}}];
        traverse.default(import_ast.ast, module.exports, undefined, import_scope);
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

function process_object(state, obj_expr) {
    let constructed_object = {};
    obj_expr.properties.forEach((property) => {
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
    return constructed_object;
}

function performAssignment(state, left, right) {
    if (left.type === "Identifier") {

    }
    else if (left.type === "MemberExpression") {
        if (left.object.name === "module" && left.property.name === "exports") {

        }
        else {

        }
    }
    else {
        throw new Error(`Unhandled Assignment TO (${left.type})`)
    }

    if ( !assignee ) {
        console.log("Warning: assigning to '" + exprToString(left) + "', which was never declared.");
    }
    else if (right === null) {

    }
    else if (right.type === "Identifier") {

    }
    else if (right.type === "FunctionExpression") {

    }
    else if (right.type === "CallExpression") {
        if (right.callee.name === "require") {

        }
        else {

        }
    }
    else if (right.type === "MemberExpression") {

    }
    else if (right.type === "NewExpression") {
        if (right.callee.type === "MemberExpression") {

        }
        else if (right.callee.type === "Identifier") {

        }
    }
    else if (right.type === "ArrayExpression") {

    }
    else if (right.type === "ConditionalExpression") {

    }
    else if (right.type === "BinaryExpression") {

    }
    else if (right.type === "NumericLiteral") {

    }
    else if (right.type === "StringLiteral") {

    }
    else if (right.type === "ObjectExpression") {

    }
    else {
        throw new Error(`Unhandled Assignment FROM: ${right.type}`)
    }
}


module.exports = {
    /* Functions of the form: function name(args...) { }*/
    FunctionDeclaration(path, state) {

    },

    /* Entering and leaving blocks */
    BlockStatement: {
      enter(path, state) {

      },
      exit(path, state) {

      }
    },

    VariableDeclaration(path, state) {
        path.node.declarations.forEach((decl) => {

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