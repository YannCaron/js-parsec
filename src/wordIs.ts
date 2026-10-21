import Context from "./runtime/Context.ts"
import { Parsem } from "./Parsem.ts"
import { Result } from "./runtime/Result.ts"
import BackupHandler from "./runtime/BackupHandler.ts"

class WordIs<T> extends Parsem<T> {

    private _str: string

    public constructor(str: string) {
        super()
        this._str = str
    }

    parse(ctx: Context<T>): Result {
        if (this._str === '') return Result.Continue

        return BackupHandler.handle(ctx, ctx => {
            for (const chr of this._str) {
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