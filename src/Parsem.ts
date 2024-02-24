import Context from "./runtime/Context"
import { Result } from "./runtime/Result"

export abstract class Parsem<T> {

    abstract parse(ctx: Context<T>): Result

    abstract toString(): string

}

export abstract class ParsemComposite<T> extends Parsem<T> {

    private _children: Array<Parsem<T>>

    constructor(...children: Array<Parsem<T>>) {
        super()
        this._children = children
    }

    get children(): Array<Parsem<T>> {
        return this._children
    }

    static flattenChain<T>(parent: Parsem<T>, children: Array<Parsem<T>>, type: typeof ParsemComposite<T>): Array<Parsem<T>> {
        const chain = new Array<Parsem<T>>()
        if (parent instanceof type) {
            for (const entry of parent.children) {
                chain.push(entry)
            }
        } else {
            chain.push(parent)
        }

        for (const child of children) {
            if (child instanceof type) {
                for (const entry of child.children) {
                    chain.push(entry)
                }
            } else {
                chain.push(child)
            }
        }

        return chain
    }

}

export abstract class ParsemDecorator<T> extends Parsem<T> {

    private _decorated: Parsem<T>

    get decorated(): Parsem<T> {
        return this._decorated
    }

    constructor(decorated: Parsem<T>) {
        super()
        this._decorated = decorated
    }

}