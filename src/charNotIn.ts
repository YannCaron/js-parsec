import Context from "./runtime/Context"
import { Parsem } from "./Parsem"
import Result from "./runtime/Result"

class CharNonIn<T> extends Parsem<T> {

    private _chars: string

    public constructor(chars: string) {
        super()
        this._chars = chars
    }

    parse(ctx: Context<T>) : Result {
        if (ctx.current != null && this._chars.indexOf(ctx.current) === -1) {
            ctx.next()
            return Result.Parsed
        }

        return Result.NotParsed
    }
    
    toString(): string {
        return `[^${this._chars}]`
    }

}

export default function charNotIn<T>(chars: string) {
    return new CharNonIn<T>(chars)
}