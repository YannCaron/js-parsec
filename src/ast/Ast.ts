import "@cyann/js-commons"
import VisitContext from "./VisitContext.ts";
import Visitor, { type VisitorConstructor } from "./Visitor.ts";

export default abstract class Ast {

    private readonly _type: string

    get type(): string {
        return this._type
    }

    constructor(type: string) {
        this._type = type
    }

    private get _functionName(): string {
        return `visit${this.type.capitalizeFirstLetter()}`
    }

    accept<T, C extends VisitContext<T>>(visitor: Visitor | VisitorConstructor, ctx: C): void {
        // Si c'est une fonction/constructeur, dispatch statique ; si c'est une instance, dispatch d'instance
        if (typeof visitor === 'function') {
            const visit = visitor[this._functionName]
            if (typeof visit === 'function') visit.call(visitor, this, ctx)
            else throw new Error(`Visitor '${visitor.name}' does not implement '${this._functionName}'!`)
        } else {
            visitor.dispatch(this, ctx, this._functionName)
        }
    }

    abstract toString(): string

}