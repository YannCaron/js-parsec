import "@cyann/js-commons"
import VisitContext from "./VisiteContext";
import Visitor from "./Visitor";

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
        if (!visitor[this._functionName])
            throw new Error(`Visitor '${visitor}' does not contain '${this._functionName}' static method!`)
        visitor[this._functionName](this, ctx)
    }

    abstract toString(): string

}