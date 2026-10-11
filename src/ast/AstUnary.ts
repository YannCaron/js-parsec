import Ast from "./Ast.ts";
import VisitContext from "./VisitContext.ts";
import Visitor, { type VisitorConstructor } from "./Visitor.ts";

export default class AstUnary extends Ast {

    protected readonly _operand1: Ast

    get operand1(): Ast {
        return this._operand1
    }

    constructor(type: string, operand1: Ast) {
        super(type)
        this._operand1 = operand1
    }

    accept<T, C extends VisitContext<T>>(visitor: Visitor | VisitorConstructor, ctx: C): void {
        if (Visitor.isAutoTraverse(visitor)) {
            this._operand1.accept(visitor, ctx)
        }
        super.accept(visitor, ctx)
    }

    toString(): string {
        return `${this.type}(${this._operand1})`
    }

}