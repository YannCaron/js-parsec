import "@cyann/js-commons"
import VisitContext from "./VisitContext.ts";
import Visitor from "./Visitor.ts";

export default abstract class Ast {

    private readonly _type: string

    get type():string {
        return this._type
    }

    constructor(type: string) {
        this._type = type
    }

    private get _functionName(): string {
        return `visit${this.type.capitalizeFirstLetter()}`
    }

    accept<T, C extends VisitContext<T>>(visitor: Visitor, ctx: C): void {
        const visit = (visitor as Record<string, any>)[this._functionName]
        if (!visit)
            throw new Error(`Visitor '${String(visitor)}' does not contain '${this._functionName}' static method!`)
        visit.call(visitor, this, ctx)
    }

    abstract toString(): string

}