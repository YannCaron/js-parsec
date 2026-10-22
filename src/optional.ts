import Context from "./runtime/Context.ts"
import { Parsem, ParsemDecorator } from "./Parsem.ts"
import { Result } from "./runtime/Result.ts"

class Optional<T> extends ParsemDecorator<T> {

    parse(ctx: Context<T>): Result {

        return ctx.memoizerHandler.handle(this,
            ctx => {
                const res = this.decorated.parse(ctx)

                if (res === Result.NotParsed)
                    return Result.Continue

                return res
            })

    }

    toString(): string {
        return `${this.decorated.toString()}?`
    }

}

export default function optional<T>(decorated: Parsem<T>): Optional<T> {
    return new Optional(decorated)
}

declare module "./Parsem" {
    interface Parsem<T> {
        optional<T>(): Optional<T>
    }
}

Parsem.prototype.optional = function <T>() {
    return optional<T>(this)
}