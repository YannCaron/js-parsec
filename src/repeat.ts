import { Parsem, ParsemDecorator } from "./Parsem"
import Context from "./runtime/Context"
import Result from "./runtime/Result"

class Repeat<T> extends ParsemDecorator<T> {

    parse(ctx: Context<T>): Result {

        let res = Result.NotParsed
        let parsedRes = this.decorated.parse(ctx)

        while (parsedRes === Result.Parsed) {
            res = Result.Parsed
            parsedRes = this.decorated.parse(ctx)
        }

        if (res === Result.NotParsed && parsedRes === Result.Continue)
            res = Result.Continue

        return res

    }
        
    toString(): string {
        return `${this.decorated.toString()}+`
    }

}

export default function repeat<T>(decorated: Parsem<T>): Repeat<T> {
    return new Repeat<T>(decorated)
}

declare module "./Parsem" {
    interface Parsem<T> {
        repeat<T>(): Repeat<T>
    }
}

Parsem.prototype.repeat = function<T> () {
    return repeat<T>(this)
}