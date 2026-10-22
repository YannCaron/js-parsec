import Context from "./runtime/Context.ts"
import { Parsem, ParsemComposite } from "./Parsem.ts"
import { Result } from "./runtime/Result.ts"
import BacktrackingHandler from "./runtime/BacktrackingHandler.ts"

class Choice<T> extends ParsemComposite<T> {

    parse(ctx: Context<T>): Result {

        for (const child of this.children) {

            if (ctx.memoizerHandler.handle(child,
                ctx => BacktrackingHandler.handle<T>(ctx,
                    ctx => child.parse(ctx))) === Result.Parsed) {

                return Result.Parsed
            }

        }

        return Result.NotParsed

    }

    toString(): string {
        const chain = this.children.map(String).join(' | ')
        return `(${chain})`
    }

}

export default function choice<T>(...children: Array<Parsem<T>>): Choice<T> {
    return new Choice<T>(...children)
}

declare module "./Parsem" {
    interface Parsem<T> {
        or<T>(...children: Array<Parsem<T>>): Choice<T>
    }
}

Parsem.prototype.or = function <T>(...children: Array<Parsem<T>>) {
    return choice(...ParsemComposite.flattenChain<T>(this, children, Choice))
}