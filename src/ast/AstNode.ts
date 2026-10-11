import Ast from "./Ast.ts";
import VisitContext from "./VisitContext.ts";
import Visitor, { type VisitorConstructor } from "./Visitor.ts";

export default class AstNode extends Ast {

    private readonly _children: Array<Ast>

    get children(): Array<Ast> {
        return this._children
    }

    constructor(type: string, ...children: Array<Ast>) {
        super(type)
        this._children = children
    }

    accept<T, C extends VisitContext<T>>(visitor: Visitor | VisitorConstructor, ctx: C): void {
        if (Visitor.isAutoTraverse(visitor)) {
            for (const child of this._children) {
                child.accept(visitor, ctx)
            }
        }
        super.accept(visitor, ctx)
    }

    toString(): string {
        const fn = (acc: any, h: any) => acc ? `${acc}, ${h}` : h
        return `${this.type}(${this._children.reduce(fn, '')})`
    }

}