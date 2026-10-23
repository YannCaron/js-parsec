import Context from "./runtime/Context.ts"
import { Parsem } from "./Parsem.ts"
import { Result } from "./runtime/Result.ts"

class WordIs<T> extends Parsem<T> {

    private _str: string

    public constructor(str: string) {
        super()
        this._str = str
    }

    parse(ctx: Context<T>): Result {
        if (this._str === '') return Result.Continue

        return ctx.backtrackingHandler.handle(ctx => {
            for (let i = 0; i < this._str.length; i++) {
                const chr = this._str.charAt(i)
                if (!ctx.sourceManager.current || chr !== ctx.sourceManager.current)
                    return Result.NotParsed
                ctx.next()
            }

            return Result.Parsed
        })
    }

    toString(): string {
        return `"${this._str}"`
    }

}

export default function wordIs<T>(str: string) {
    return new WordIs<T>(str)
}
