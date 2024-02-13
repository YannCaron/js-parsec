import Ast from "./Ast";

export default class AstTerm extends Ast {

    private readonly _value: string

    get value(): string {
        return this._value
    }

    constructor(type: string, value: string) {
        super(type)
        this._value = value
    }

    toString(): string {
        return `${this.type}('${this.value}')`
    }

}