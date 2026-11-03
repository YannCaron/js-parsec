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
        if (!(this._ref instanceof Null))
            throw new Error(`Expression reference cannot be replaced!`)
        this._ref = v;
    }

    public get name(): string {
        return this._name ?? 'Expression'
    }

    constructor(name?: string) {
        super()
        this._ref = new Null<T>
        this._name = name
    }

    parse(ctx: Context<T>): Result {

        const pos = ctx.sourceManager.pos
        if (ctx.leftRecursionHandler._recurse.get(this) === pos) {
            console.log('recursion detected');
            return Result.Seed
        }

        ctx.leftRecursionHandler._recurse.set(this, pos)

        try {

            let res = this.ref.parse(ctx)

            if (res === Result.Parsed) {
                if (!ctx.leftRecursionHandler._continuation.isEmpty) {

                    const continuation = ctx.leftRecursionHandler._continuation.pop()
                    console.log(continuation);
                    while (res === Result.Parsed) {
                        console.log(ctx.sourceManager);
                        res = continuation?.parse(ctx) || Result.NotParsed
                        console.log('res', res);
                    }

                    return Result.Parsed
                }
            }

            return res

        } finally {
            ctx.leftRecursionHandler._recurse.delete(this)
        }

    }

    toString(): string {
        return this.name
    }

}

function expression<T>(name?: string): Expression<T> {
    return new Expression<T>(name)
}

export { expression, Expression }