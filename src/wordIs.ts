import Context from "./runtime/Context"
import { Parsem } from "./Parsem"
import Result from "./runtime/Result"

class WordIs<T> extends Parsem<T> {

    private _str: string

    public constructor(str: string) {
        super()
        this._str = str
    }

    parse(ctx: Context<T>): Result {
        return Context.handleBackup(ctx, ctx => {
            for (const chr of this._str) {
                if (!ctx.current || chr !== ctx.current)
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