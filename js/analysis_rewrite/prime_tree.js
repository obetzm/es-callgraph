/*

if (ast.type === "Program") {//NOTE: assuming we only hit this at top of file, dangerous?
}
else if (ast.type === "FunctionDeclaration" && ast.id.name !== undefined ) {
else if (ast.type === "FunctionExpression" && ast.id.name !== undefined && ast.id.name !== null) {
    else if (ast.type === "BlockStatement") {
        else if (ast.type === "ExpressionStatement") {
            else if (ast.type === "VariableDeclaration") {
                else if (ast.type === "AssignmentExpression") {
                    else if (ast.type === "CallExpression") {

*/

class DeclarationNode extends AbstractNode {
    constructor(group, variable, value)
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

    static make(ast_node, group) {
        if (ast_node.type === "Program" || ast_node.type === "BlockStatement") {
            let children = ast_node.body.flatMap((n) => AbstractNode.make(n, group));
            return new BlockNode(ast_node, group, children);
        }
        else if (ast_node.type === "ExpressionStatement") {
            return AbstractNode.make(ast_node.expression, group);
        }
        //Expressions -- these can return multiple values which will be flatmapped
        else if (ast_node.type === "VariableDeclaration") {
            return ast_node.declarations.map
        }
        else if (ast_node.type === "AssignmentExpression") {

        }
    }
}




module.exports = {
  rewrite_ast: AbstractNode.make
};