import Context from "./runtime/Context"
import { Parsem } from "./Parsem"
import { Result } from "./runtime/Result"

class WordNotIn<T> extends Parsem<T> {

    private _strs: string[]

    public constructor(...strs: string[]) {
        super()
        this._strs = strs
    }

    parseWordNotIs(ctx: Context<T>, str: string) {
        return Context.handleBackup(ctx, ctx => {
            for (const chr of str) {
                if (!ctx.current || chr !== ctx.current)
                    return Result.NotParsed
                ctx.next()
            }

            return Result.Parsed
        })

    }

    // TODO: Continue here by creating unit test

    parse(ctx: Context<T>): Result {
        if (this._strs.isEmpty) return Result.Continue

        return Context.handleBackup(ctx, ctx => {

            for (const str of this._strs) {
                const result = this.parseWordNotIs(ctx, str)

                if (result === Result.Parsed)
                    return Result.NotParsed
            }

            ctx.next()
            return Result.Continue
        })
    }

    toString(): string {
        return `[^${this._strs.map(e => `(${e})`).join(' | ')}]`
    }

}

export default function wordNotIn<T>(str: string) {
    return new WordNotIn<T>(str)
}