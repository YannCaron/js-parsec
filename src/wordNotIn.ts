import Context from "./runtime/Context.ts"
import { Parsem } from "./Parsem.ts"
import { Result } from "./runtime/Result.ts"
import BacktrackingHandler from "./runtime/handler/BacktrackingHandler.ts"

class WordNotIn<T> extends Parsem<T> {

    private readonly _strs: string[]

    public constructor(...strs: string[]) {
        super()
        this._strs = strs
    }

    parseWordNotIs(ctx: Context<T>, str: string) {
        return BacktrackingHandler.handle(ctx, ctx => {
            for (const chr of str) {
                if (!ctx.sourceManager.current || chr !== ctx.sourceManager.current)
                    return Result.NotParsed
                ctx.next()
            }

            return Result.Parsed
        })

    }

    parse(ctx: Context<T>): Result {
        if (this._strs.isEmpty) return Result.Continue
        if (ctx.sourceManager.current === null) return Result.NotParsed
  
        return BacktrackingHandler.handle(ctx, ctx => {

            for (const str of this._strs) {
                const result = this.parseWordNotIs(ctx, str)

                if (result === Result.Parsed)
                    return Result.NotParsed
            }

            ctx.next()
            return Result.Parsed
        })
    }

    toString(): string {
        return `[^${this._strs.map(String).join(' | ')}]`
    }

}

export default function wordNotIn<T>(str: string) {
    return new WordNotIn<T>(str)
}