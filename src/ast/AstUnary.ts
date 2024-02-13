import Ast from "./Ast";
import VisitContext from "./VisiteContext";
import Visitor from "./Visitor";

export default class AstUnary extends Ast {

    protected readonly _operand1: Ast

    get operand1(): Ast {
        return this._operand1
    }

    constructor(type: string, operand1: Ast) {
        super(type)
        this._operand1 = operand1
    }

    accept<T, C extends VisitContext<T>>(visitor: Visitor, ctx: C): void {
        if (visitor[Visitor.AUTO_TRAVERS_PROPERTY_NAME]) {
            this._operand1.accept(visitor, ctx)
        }
        super.accept(visitor, ctx)
    }

    toString(): string {
        return `${this.type}(${this._operand1})`
    }

}