import Context from "./runtime/Context"
import { Parsem, ParsemComposite } from "./Parsem"
import Result from "./runtime/Result"


class Choice<T> extends ParsemComposite<T> {

    parse(ctx: Context<T>): Result {

        for (const child of this.children) {

            if (Context.handleBackup<T>(ctx, ctx => child.parse(ctx)) === Result.Parsed) {
                return Result.Parsed
            }

        }

        return Result.NotParsed

    }

    toString(): string {
        const chain = this.children.map(e => e.toString()).reduce((acc, e) => `${acc} | ${e}`)
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

Parsem.prototype.or = function<T> (...children: Array<Parsem<T>>) {
    return choice(...ParsemComposite.flattenChain<T>(this, children, Choice))
}