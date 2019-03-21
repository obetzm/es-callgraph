
let {GraphNode, GraphEdge, CallGraph} = require("./call_graph");

function resolve(state, target) {
    let notFound = true;
    let i = state.length - 1;
    let resolution = undefined;
    while (notFound && i > -1) {
        resolution = state[i].scope[target];
        notFound = resolution !== undefined;
        --i
    }
    return resolution;
}

function callFunction(state, callee) {
    console.log("Calling: " + callee.name)
}

function defineFunction(scope, name, group, node) {
    let this_func = new GraphNode("lambda", name, false, group, node);
    scope[name] = this_func;
    CallGraph.instance.add_node(this_func)
}

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
            let assignee = resolve(state, left.object.name)
            console.log("assignee found for object: " + assignee);
        }
    }
    else {
        throw new Error(`Unhandled Assignment TO (${left.type})`)
    }

    if (right === null) {
        assignee[name] = right;
    }
    else if (right.type === "FunctionExpression") {
        defineFunction(assignee, name, state[0].id, right)
    }
    else if (right.type === "CallExpression") {
        //TODO: returns flow to lhs, a function handle could be returned. Otherwise handled in CallExpression visitor
    }
    else if (right.type === "MemberExpression") {
        //TODO: resolve object, then resolve field
    }
    else if (right.type === "NewExpression") {

    }
    else if (right.type === "NumericLiteral") {

    }
    else if (right.type === "ObjectExpression") {

    }
    else {
        throw new Error(`Unhandled Assignment Type FROM: ${right.type}`)
    }
}


module.exports = {
    /* Functions of the form: function name(args...) { }*/
    FunctionDeclaration(path, state) {
        console.log("At: " + path.node.id.name);
        defineFunction(state[state.length-1].scope, path.node.id.name, state[0].id, path.node)
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
        callFunction(state, path.node.callee)
    }
};