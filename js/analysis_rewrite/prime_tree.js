
let {GraphNode} = require("../call_graph");

function* produce_temp_var(prefix) {
    while (true) {
        yield prefix + (this.count++ || 0);
    }
}
let TempVarGenerator = produce_temp_var("ANALYSIS_TMP_VAR");



class AbstractNode {
    constructor(group) {
        this.group = group;
    }

    apply(visitor) {
        throw new Error("Attempted to apply visitor to an abstract node. (Use a subtype)");
    }



    static flattenExpression(ast_node, group) {
        if (ast_node.type === "Identifier") {
            return new VariableNode(group, ast_node.name);
        }
        else if (ast_node.type === "Literal") {
            return new LiteralNode(group, ast_node.value);
        }
        else if (ast_node.type === "MemberExpression") {
            let obj = AbstractNode.flattenExpression(ast_node.object, group);
            let field = AbstractNode.flattenExpression(ast_node.property, group);
            return new FieldAccessNode(group, obj, field);
        }
        else if (ast_node.type === "AssignmentExpression") {
            /*if (ast_node.left.type === "Identifier") {
                let lhs = new VariableNode(group, ast_node.name);
                if (ast_node.right.type === "MemberExpression") {
                    return AbstractNode.expandMemberExpression(ast_node.right, lhs, null);
                }
                else {
                    let rhs = AbstractNode.flattenExpression(ast_node.right, group);
                    return new ReassignmentNode(group, lhs, rhs);
                }
            }
            else if (ast_node.right.type !== "MemberExpression" ) {
                if (ast_node.left.type === "MemberExpression") {
                    return AbstractNode.expandMemberExpression(ast_node.left, )
                }
                return new AssignmentNode(group, lhs, rhs);
            }*/
            let lhs = AbstractNode.flattenExpression(ast_node.left, group);
            let rhs = AbstractNode.flattenExpression(ast_node.right, group);
            return new ReassignmentNode(group, lhs, rhs);
        }
        else if (ast_node.type === "CallExpression") {
            return new FuncCallNode(group, ast_node.callee, ast_node.arguments);
        }
        else if (ast_node.type === "FunctionExpression") {
            return new FunctionNode(group, ast_node.id, ast_node.params, ast_node.body.body);
        }
        else if (ast_node.type === "ObjectExpression") {
            return new ObjectNode(group, ast_node.properties);
        }
    }//flattenExpression

    static make(ast_node, group) {
        if (ast_node.type === "Program" || ast_node.type === "BlockStatement") {
            let children = ast_node.body.reduce((a,n) => a.concat(AbstractNode.make(n, group)), []);
            return new BlockNode(group, children);
        }
        else if (ast_node.type === "ExpressionStatement") {
            return AbstractNode.flattenExpression(ast_node.expression, group);
        }
        else if (ast_node.type === "VariableDeclaration") {
            return ast_node.declarations.map((d) => {
                let lhs = AbstractNode.flattenExpression(d.id, group);
                let rhs = (d.init) ? AbstractNode.flattenExpression(d.init, group) : new LiteralNode(group, null);
                return new DeclarationNode(group, lhs, rhs);
            });
        }
        else if (ast_node.type === "FunctionDeclaration") {
            return new FunctionNode(group, ast_node.id.name, ast_node.params, ast_node.body.body);
        }
        else if (ast_node.type === "IfStatement") {
            return new ConditionNode(group, AbstractNode.flattenExpression(ast_node.test, group), AbstractNode.make(ast_node.consequent, group), AbstractNode.make(ast_node.alternate, group));
        }
        else if (ast_node.type === "WhileStatement") {
            return new WhileNode(group, AbstractNode.flattenExpression(ast_node.test, group), AbstractNode.make(ast_node.body, group));
        }
        else if (ast_node.type === "ForStatement") {
            return new WhileNode(group, AbstractNode.flattenExpression(ast_node.test, group),
                                        AbstractNode.flattenExpression(ast_node.init, group),
                                        AbstractNode.flattenExpression(ast_node.update, group),
                                        AbstractNode.make(ast_node.body, group));
        }
    }//make
}//AbstractNode


class VariableNode extends AbstractNode {
     constructor(group, name) {
        super(group);
        this.name = name;
     }

    apply(visitor) {
        visitor.visit(this);
    }
}

class ObjectNode extends AbstractNode {
    constructor(group, properties) {
        super(group);
        this.properties = {};
        properties
            .map((p)=>({key: p.key.name, val: AbstractNode.flattenExpression(p.value, group)}))
            .forEach((p) => this.properties[p.key] = p.val);
    }

    apply(visitor) {
        visitor.visit(this);
    }

    find(property) {
        return this.properties[property] || null;
    }
}


class LiteralNode extends AbstractNode {
    constructor(group, value) {
        super(group);
        this.value = value;
    }

    apply(visitor) {
        visitor.visit(this);
    }
}

class AssignmentNode extends AbstractNode {
    constructor(group, lhs, rhs) {
        super(group);
        this.lhs = lhs;
        this.rhs = rhs;
    }

    apply(visitor) {
        visitor.visit(this);
    }
}

class ReassignmentNode extends AssignmentNode {
    constructor(group, lhs, rhs) {
        super(group, lhs, rhs);
    }
}

class DeclarationNode extends AssignmentNode {
    constructor(group, lhs, rhs) {
        super(group, lhs, rhs);
    }
}

class ConditionNode extends AbstractNode {
    constructor(group, condition, tbody, fbody) {
        super(group);
        this.condition = condition;
        this.tbody = tbody;
        this.fbody = fbody;
    }

    apply(visitor) {
        visitor.visit(this);
        this.condition.apply(visitor);
        this.tbody.apply(visitor);
        if (this.fbody !== null) this.fbody.apply(visitor);
    }
}

class WhileNode extends AbstractNode {
    constructor(group, condition, body) {
        super(group);
        this.condition = condition;
        this.body = body;
    }
    apply(visitor) {
        visitor.visit(this);
        this.condition.apply(visitor);
        this.body.apply(visitor);
    }
}

class ForNode extends AbstractNode {
    constructor(group, condition, init, update, body) {
        super(group);
        this.condition = condition;
        this.init = init;
        this.update = update;
        this.body = body;
    }
}

class BlockNode extends AbstractNode {
    constructor(group, children) {
        super(group);
        this.children = children;
    }

    apply(visitor) {
        visitor.visit(this);
        this.children.forEach((n) => n.apply(visitor));
        visitor.afterBlock(this);
    }
}

class FunctionNode extends AbstractNode {
    constructor(group, name, params, body) {
        super(group);
        this._name = name;
        this.params = params.map((a)=>AbstractNode.flattenExpression(a, group));
        this.body = body.map((n) => AbstractNode.make(n, group));
        this.node = new GraphNode("lambda", name, false, group, this);
    }

    set name(nv) {
        this._name = nv;
        this.node.label = nv;
    }

    get name() {
        return this._name;
    }

    exec(visitor) { //TODO: return
        this.body.forEach((n) => n.apply(visitor));
    }

    apply(visitor) {
        visitor.visit(this);
    }
}

class FuncCallNode extends AbstractNode {
    constructor(group, callee, params) {
        super(group);
        this.callee = AbstractNode.flattenExpression(callee, group);
        this.params = params.map((a)=>AbstractNode.flattenExpression(a, group));
    }

    apply(visitor) {
        visitor.visit(this);
    }
}

class FieldAccessNode extends AbstractNode {
    constructor(group, obj, field) {
        super(group);
        this.obj = obj;
        this.field = field;
    }

    apply(visitor) {//TODO: recursion for obj.subobj.field
        visitor.visit(this);
    }
}





module.exports = {
    rewrite_ast: AbstractNode.make,
    AbstractNode: AbstractNode,
    VariableNode: VariableNode,
    ObjectNode: ObjectNode,
    LiteralNode: LiteralNode,
    AssignmentNode: AssignmentNode,
    ReassignmentNode: ReassignmentNode,
    DeclarationNode: DeclarationNode,
    BlockNode: BlockNode,
    ConditionNode: ConditionNode,
    WhileNode: WhileNode,
    ForNode: ForNode,
    FunctionNode: FunctionNode,
    FuncCallNode: FuncCallNode,
    FieldAccessNode: FieldAccessNode

};