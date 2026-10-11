import Ast from "./Ast.ts";
import VisitContext from "./VisitContext.ts";
import Visitor, { type VisitorConstructor } from "./Visitor.ts";

export default class AstBinary extends Ast {

    private readonly _operand1: Ast
    private readonly _operand2: Ast

    get operand1(): Ast {
        return this._operand1
    }

    get operand2(): Ast {
        return this._operand2
    }

    constructor(type: string, operand1: Ast, operand2: Ast) {
        super(type)
        this._operand1 = operand1
        this._operand2 = operand2
    }

    accept<T, C extends VisitContext<T>>(visitor: Visitor | VisitorConstructor, ctx: C): void {
        if (Visitor.isAutoTraverse(visitor)) {
            this._operand1.accept(visitor, ctx)
            this._operand2.accept(visitor, ctx)
        }
        super.accept(visitor, ctx)
    }

    toString(): string {
        return `${this.type}(${this._operand1}, ${this._operand2})`
    }

}