import Context from "./runtime/Context.ts"
import { Parsem } from "./Parsem.ts"
import { Result } from "./runtime/Result.ts"
import Utils from "./runtime/Utils.ts"

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

    public get ref(): Parsem<T> {
        return this._ref
    }

    public set ref(v: Parsem<T>) {
        this._ref = v;
    }

    constructor(ref: Parsem<T> = new Null<T>()) {
        super()
        this._ref = ref
    }

    parse(ctx: Context<T>): Result {
        return Utils.handleSeedGrowing(this, ctx,
            ctx => this.ref.parse(ctx))
    }

    toString(): string {
        return this.ref.toString()
    }

}

function expression<T>(ref?: Parsem<T>): Expression<T> {
    return new Expression<T>(ref)
}

export { expression, Expression }