import Context from "./runtime/Context.ts"
import { Parsem } from "./Parsem.ts"
import { Result } from "./runtime/Result.ts"

class Null<T> extends Parsem<T> {
    parse(_: Context<T>): Result {
        throw new Error("Recursive expression reference 'ref' is not initialized!")
    }
    toString(): string {
        return '<uninitialized>'
    }
}

class Expression<T> extends Parsem<T> {

    private _ref: Parsem<T>
    private readonly _name?: string

    public get ref(): Parsem<T> {
        return this._ref
    }

    public set ref(v: Parsem<T>) {
        this._ref = v;
    }

    public get name(): string {
        return this._name ?? 'Expression'
    }

    constructor(ref: Parsem<T> = new Null<T>(), name?: string) {
        super()
        this._ref = ref
        this._name = name
    }

    parse(ctx: Context<T>): Result {

        const res = this.ref.parse(ctx)
        return res

    }

    toString(): string {
        return this.name
    }

}

function expression<T>(ref?: Parsem<T>, name?: string): Expression<T> {
    return new Expression<T>(ref, name)
}

export { expression, Expression }