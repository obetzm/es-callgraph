
let {VariableNode,ObjectNode,LiteralNode,AssignmentNode,BlockNode,FunctionNode,FieldAccessNode,FuncCallNode} =
    require("./prime_tree");

class AbstractVisitor {

    visitVariable(node) {}
    visitObjectLiteral(node) {}
    visitLiteral(node) {}
    visitAssignment(node) {}
    visitBlock(node) {}
    visitFunctionDeclaration(node) {}
    visitFieldAccess(node) {}
    visitFuncCall(node) {}

    afterBlock(node) {}

    visit(node) {
        if (node instanceof VariableNode)
            this.visitVariable(node);
        else if (node instanceof ObjectNode)
            this.visitObjectLiteral(node);
        else if (node instanceof LiteralNode)
            this.visitLiteral(node);
        else if (node instanceof AssignmentNode)
            this.visitAssignment(node);
        else if (node instanceof BlockNode)
            this.visitBlock(node);
        else if (node instanceof FunctionNode)
            this.visitFunctionDeclaration(node);
        else if (node instanceof FieldAccessNode)
            this.visitFieldAccess(node);
        else if (node instanceof FuncCallNode)
            this.visitFuncCall(node);
        else throw new Error("unknown node type.")
    }
}


module.exports = {
    AbstractVisitor: AbstractVisitor
};
