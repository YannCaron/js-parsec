import Context from "./runtime/Context"
import { Parsem, ParsemComposite } from "./Parsem"
import Result from "./runtime/Result"


class Sequence<T> extends ParsemComposite<T> {

    parse(ctx: Context<T>): Result {

        return Context.handleBackup(ctx, ctx => this.doparse(ctx))

    }

    doparse(ctx: Context<T>): Result {

        let res = Result.Continue

        for (const child of this.children) {

            const childRes = child.parse(ctx)

            if (childRes === Result.NotParsed) {
                return Result.NotParsed
            } else if (childRes === Result.Parsed) {
                res = Result.Parsed
            }

        }

        return res

    }

    toString(): string {
        const chain = this.children.map(e => e.toString()).reduce((acc, e) => `${acc} ${e}`)
        return `(${chain})`
    }

}

export default function sequence<T>(...children: Array<Parsem<T>>): Sequence<T> {
    return new Sequence<T>(...children)
}

declare module "./Parsem" {
    interface Parsem<T> {
        then<T>(...children: Array<Parsem<T>>): Sequence<T>
    }
}

Parsem.prototype.then = function<T> (...children: Array<Parsem<T>>) {
    return sequence(...ParsemComposite.flattenChain<T>(this, children, Sequence))
}