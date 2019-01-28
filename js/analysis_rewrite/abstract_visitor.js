
let {VariableNode,ObjectNode,LiteralNode,UnaryNode,BinaryNode,AssignmentNode,BlockNode,FunctionNode,FieldAccessNode,
    FuncCallNode,ReturnNode, WhileNode, ForNode, ConditionNode} =
    require("./prime_tree");

class AbstractVisitor {

    visitVariable(node) {}
    visitObjectLiteral(node) {}
    visitLiteral(node) {}
    visitUnaryExpr(node) {}
    visitBinaryExpr(node) {}
    visitAssignment(node) {}
    visitBlock(node) {}
    visitFunctionDeclaration(node) {}
    visitReturn(node) {}
    visitFieldAccess(node) {}
    visitFuncCall(node) {}
    visitForLoop(node) {}
    visitWhileLoop(node) {}
    visitCondition(node) {}

    afterBlock(node) {}

    visit(node) {
        if (node instanceof VariableNode)
            this.visitVariable(node);
        else if (node instanceof ObjectNode)
            this.visitObjectLiteral(node);
        else if (node instanceof LiteralNode)
            this.visitLiteral(node);
        else if (node instanceof UnaryNode)
            this.visitUnaryExpr(node);
        else if (node instanceof BinaryNode)
            this.visitBinaryExpr(node);
        else if (node instanceof AssignmentNode)
            this.visitAssignment(node);
        else if (node instanceof BlockNode)
            this.visitBlock(node);
        else if (node instanceof FunctionNode)
            this.visitFunctionDeclaration(node);
        else if (node instanceof ReturnNode)
            this.visitReturn(node);
        else if (node instanceof FieldAccessNode)
            this.visitFieldAccess(node);
        else if (node instanceof FuncCallNode)
            this.visitFuncCall(node);
        else if (node instanceof ConditionNode)
            this.visitCondition(node);
        else if (node instanceof WhileNode)
            this.visitWhileLoop(node);
        else if (node instanceof ForNode)
            this.visitForLoop(node);
        else throw new Error("unknown node type.")
    }
}


module.exports = {
    AbstractVisitor: AbstractVisitor
};
