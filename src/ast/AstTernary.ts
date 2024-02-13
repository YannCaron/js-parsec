import Ast from "./Ast";
import VisitContext from "./VisiteContext";
import Visitor from "./Visitor";

export default class AstTernary extends Ast {

    private readonly _operand1: Ast
    private readonly _operand2: Ast
    private readonly _operand3: Ast

    get operand1(): Ast {
        return this._operand1
    }

    get operand2(): Ast {
        return this._operand2
    }

    get operand3(): Ast {
        return this._operand3
    }

    constructor(type: string, operand1: Ast, operand2: Ast, operand3: Ast) {
        super(type)
        this._operand1 = operand1
        this._operand2 = operand2
        this._operand3 = operand3
    }

    accept<T, C extends VisitContext<T>>(visitor: Visitor, ctx: C): void {
        if (visitor[Visitor.AUTO_TRAVERS_PROPERTY_NAME]) {
            this._operand1.accept(visitor, ctx)
            this._operand2.accept(visitor, ctx)
            this._operand3.accept(visitor, ctx)
        }
        super.accept(visitor, ctx)
    }

    toString(): string {
        return `${this.type}(${this._operand1}, ${this._operand2}, ${this._operand3})`
    }

}