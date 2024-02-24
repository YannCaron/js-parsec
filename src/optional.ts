import Context from "./runtime/Context"
import { Parsem, ParsemDecorator } from "./Parsem"
import { Result } from "./runtime/Result"

class Optional<T> extends ParsemDecorator<T> {

    parse(ctx: Context<T>): Result {

        const res = this.decorated.parse(ctx)

        if (res === Result.NotParsed)
            return Result.Continue

        return Result.Parsed

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