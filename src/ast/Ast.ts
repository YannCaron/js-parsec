import "@cyann/js-commons"
import VisitContext from "./VisitContext.ts";
import Visitor from "./Visitor.ts";

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

    accept<T, C extends VisitContext<T>>(visitor: Visitor, ctx: C): void {
        visitor.dispatch(this, ctx, this._functionName)
    }

    abstract toString(): string

}