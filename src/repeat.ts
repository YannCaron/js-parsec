import { Parsem, ParsemDecorator } from "./Parsem.ts"
import BacktrackingHandler from "./runtime/BacktrackingHandler.ts"
import Context from "./runtime/Context.ts"
import { Result } from "./runtime/Result.ts"

class Repeat<T> extends ParsemDecorator<T> {

    parse(ctx: Context<T>): Result {

        return ctx.memoizerHandler.handle(this,
            ctx => BacktrackingHandler.handle(ctx, ctx => {
                let res = Result.NotParsed
                let hasNext = ctx.sourceManager.current != null
                let parsedRes = this.decorated.parse(ctx)

                while (parsedRes === Result.Parsed && hasNext) {
                    const startPos = ctx.sourceManager.pos
                    res = Result.Parsed
                    parsedRes = this.decorated.parse(ctx)

                    hasNext = ctx.sourceManager.current != null

                    if (parsedRes === Result.Parsed && ctx.sourceManager.pos === startPos)
                        throw Error(`Infinite loop detected in grammar: ${this.toString()}!`)
                }

                if (res === Result.NotParsed && parsedRes === Result.Continue)
                    res = Result.Continue

                return res
            })
        )


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

Parsem.prototype.repeat = function <T>() {
    return repeat<T>(this)
}