import Context from "./runtime/Context.ts"
import { Parsem } from "./Parsem.ts"
import { Result } from "./runtime/Result.ts"

class CharInInterval<T> extends Parsem<T> {

    private _begin: number
    private _end: number

    public constructor(begin: string, end: string) {
        super()
        if (begin.length != 1)
            throw new Error(`Begin: '${begin}' should be single character!`)

        if (end.length != 1)
            throw new Error(`End: '${end}' should be single character!`)

        this._begin = begin.charCodeAt(0)
        this._end = end.charCodeAt(0)
    }

    parse(ctx: Context<T>): Result {
        if (ctx.sourceManager.current != null && this._begin <= ctx.sourceManager.current.charCodeAt(0) && ctx.sourceManager.current.charCodeAt(0) <= this._end) {
            ctx.next()
            return Result.Parsed
        }

        return Result.NotParsed
    }

    toString(): string {
        return `[${String.fromCharCode(this._begin)}-${String.fromCharCode(this._end)}]`
    }

}

export default function charInInterval<T>(begin: string, end: string) {
    return new CharInInterval<T>(begin, end)
}