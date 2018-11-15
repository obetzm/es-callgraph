
function* produce_temp_var(prefix) {
    while (true) {
        yield prefix + (this.count++ || 0);
    }
}
let TempVarGenerator = produce_temp_var("ANALYSIS_TMP_VAR");

class ObjectNode extends AbstractNode {
    constructor(group, properties) {
        super(group);
        this.properties = {};
        properties.flatMap((p)=>)
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

class BlockNode extends AbstractNode {
    constructor(group, children) {
        super(group);
        this.children = children;
    }

    apply(visitor) {
        visitor.visit(this);
        this.children.forEach((n) => n.apply(visitor));
    }
}

class AbstractNode {
    constructor(group) {
        this.group = group;
    }

    apply(visitor) {
        throw new Error("Attempted to apply visitor to an abstract node. (Use a subtype)");
    }

    static flattenExpression(ast_node, group) {
        if (ast_node.type === "Identifier") {

        }
        else if (ast_node.type === "Literal") {
            return new LiteralNode(group, ast_node.value);
        }
        else if (ast_node.type === "MemberExpression") {//TODO: ???
            let produced_exprs = [];
            if (ast_node.object === "MemberExpression") {
                produced_exprs = produced_exprs.concat(AbstractNode.flattenExpression(ast_node.object));
            }
            return produced_exprs.concat(new AssignmentNode())
        }
        else if (ast_node.type === "AssignmentExpression") {
            let lhs = AbstractNode.flattenExpression(ast_node.left, group);
            let rhs = AbstractNode.flattenExpression(ast_node.right, group);
            return new AssignmentNode(group, lhs, rhs);
        }
        else if (ast_node.type === "CallExpression") {
            let callee = AbstractNode.flattenExpression(ast_node.callee, group);
        }
        else if (ast_node.type === "FunctionExpression") {

        }
        else if (ast_node.type === "ObjectExpression") {

        }
    }

    static make(ast_node, group) {
        if (ast_node.type === "Program" || ast_node.type === "BlockStatement") {
            let children = ast_node.body.flatMap((n) => AbstractNode.make(n, group));
            return new BlockNode(ast_node, group, children);
        }
        else if (ast_node.type === "ExpressionStatement") {
            return AbstractNode.flattenExpression(ast_node.expression, group);
        }
        else if (ast_node.type === "VariableDeclaration") {
            return ast_node.declarations.map((d) => {
                let lhs = AbstractNode.flattenExpression(d.id, group);
                let rhs = AbstractNode.flattenExpression(d.init, group);
                new AssignmentNode(group, lhs, rhs);
            });
        }
        else if (ast_node.type === "FunctionDeclaration") {

        }
    }
}




module.exports = {
  rewrite_ast: AbstractNode.make
};