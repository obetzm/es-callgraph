
let {GraphNode, GraphEdge, CallGraph} = require("./call_graph");
let path = require("path");
let babel = require("@babel/core");
let traverse = require("@babel/traverse");
let {CallConstraint, AssignConstraint, ConstraintTarget} = require("./constraints");
let {ObjectScope, Possibilities} = require("./scope");


function convert_node_to_constraint_target(state, node) {
    if (node.type === "Identifier" || node.type === "MemberExpression") {
        return ConstraintTarget.make(state.current_scope, node);
    }
    else if (node.type === "ObjectExpression") {
        let obj = new ObjectScope(state.current_scope);
        node.properties.forEach((prop) => {
            let name = prop.key.name;
            let value = convert_node_to_constraint_target(state, prop.value);
            obj.define(name, value);
        });

        return obj
    }
    else if (node.type === "FunctionExpression") {
        let func_name = node.id.name || "anonymous";
        let this_func = new GraphNode("lambda", func_name, false, state.lambda_id, node, state.file);
        node.cached_func = this_func;
        CallGraph.instance.add_node(this_func);
        return new Possibilities(this_func);
    }
    return null;
}


function handle_assignment(state, left, right) {
    let ret = null;
    let from = convert_node_to_constraint_target(state, right);
    let to = convert_node_to_constraint_target(state, left);

    if (from && to) ret = new AssignConstraint(from, to);
    return ret;
}


module.exports = {


    /* Functions of the form: function name(args...) { }*/
    FunctionDeclaration: { //TODO: here and FuncExpr: params declared in inner scope
        enter(path, state) {
            /* The function name behaves like any other identifier declaration in the current scope.
               Declare the name as a new identifier and assign it a value representing the function that may be called.
             */
            let func_name = path.node.id.name;
            let func_rep = new GraphNode("lambda", func_name, false, state.lambda_id, path.node, state.file);
            CallGraph.instance.add_node(func_rep);
            let associated_funcs = state.current_scope.define(func_name, func_rep);

            /* Until we leave this node in the AST, future declarations encountered are in the "body" of this function.
               Setup this function body's internal scope now, and 'pop' it when we exit this node.
             */
            let id = path.scope.uid;
            state.current_scope = state.current_scope.create_subscope(id);
            state.current_scope.associated_funcs = associated_funcs;

        },
        exit(path, state) {
            state.current_scope = state.current_scope.close_scope();
        }
    },
    FunctionExpression: {
        enter(path, state) {
            /* Until we leave this node in the AST, future declarations encountered are in the "body" of this function.
               Setup this function body's internal scope now, and 'pop' it when we exit this node.

               Unlike Declarations, we don't know the node name here, so we'll handle creation of graph node in assignment instead.
             */
            let id = path.scope.uid;
            state.current_scope = state.current_scope.create_subscope(id);
            if (path.node.cached_func) {
                state.current_scope.associated_funcs = new Possibilities(path.node.cached_func);
            }


        },
        exit(path, state) {
            state.current_scope = state.current_scope.close_scope();
        }
    },


    VariableDeclaration(path, state) {
        path.node.declarations.forEach((decl) => {
            if ( !decl.init ) {
                state.current_scope.define(decl.id.name, null);
            }
            else if (decl.init.type.includes("Literal")) {
                state.current_scope.define(decl.id.name, decl.init);
            }
            else {
                let new_constraint = handle_assignment(state, decl.id, decl.init);
                if (new_constraint) state.constraints.assignments.push(new_constraint);
            }

        });
    },

    AssignmentExpression(path, state) {
        let from = ConstraintTarget.make(state.current_scope, path.node.left);

        if (path.node.right.type.includes("Literal")) {
            new AssignConstraint(from, path.node.right); //can't just do current_scope.assign here because left could be a memberexpression
        }
        else {
            let new_constraint = handle_assignment(state, path.node.left, path.node.right);
            if (new_constraint) state.constraints.assignments.push(new_constraint);
        }

    },

    /* call sites */
    CallExpression(path, state) {
        let callee = path.node.callee;
        if (callee.type === "MemberExpression" || callee.type === "Identifier") {
            state.constraints.calls.push(new CallConstraint(state.current_scope, ConstraintTarget.make(state.current_scope, callee)));
        }
        else throw new Error(`Unsupported call type: ${callee.type}`)

    }
};