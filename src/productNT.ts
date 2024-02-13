import Context from "./runtime/Context"
import { Parsem, ParsemDecorator } from "./Parsem"
import Result from "./runtime/Result"

class ProductNT<T> extends ParsemDecorator<T> {

    private readonly _producer?: (...v: Array<T>) => T
    private readonly _nbArgs: number | undefined
    private _type: string

    getType(): string {
        return this._type
    }

    type(type: string): this {
        this._type = type
        return this
    }

    constructor(decorated: Parsem<T>, producer?: (...v: Array<T>) => T, nbArgs?: number) {
        super(decorated)
        this._producer = producer
        this._type = ''
        this._nbArgs = nbArgs
    }

    parse(ctx: Context<T>): Result {

        return Context.handleNTProduction<T>(
            ctx, ctx => this.decorated.parse(ctx),
            this._producer,
            this._nbArgs
        )

    }

    toString(): string {
        return this.decorated.toString()
    }

}

function productNT<T>(decorated: Parsem<T>, producer?: (...v: Array<T>) => T, nbArgs?: number): ProductNT<T> {
    return new ProductNT<T>(decorated, producer, nbArgs)
}

declare module "./Parsem" {
    interface Parsem<T> {
        productNT<T>(producer?: (...v: Array<T>) => T): ProductNT<T>
    }
}

Parsem.prototype.productNT = function <T>(producer?: (...v: Array<T>) => T) {
    return productNT<T>(this, producer)
}

export {productNT, ProductNT}
