import Context from "./runtime/Context.ts"
import { Parsem, ParsemDecorator } from "./Parsem.ts"
import { Result } from "./runtime/Result.ts"
import { PushAggregatorProductionEffect } from "./runtime/manager/ProductionEffectJournal.ts"

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

        return ProductNT.handleProduction<T>(
            ctx, ctx => this.decorated.parse(ctx),
            this._producer,
            this._nbArgs
        )

    }

    static handleProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (...v: Array<T>) => T, nbArgs?: number): Result {

        const productionEffectsLength = ctx.productionEffectJournal.length

        // run encapsulated lambda
        const res = lambda(ctx)

        if (res !== Result.Parsed || !producer)
            return res

        const arity = nbArgs !== undefined ? nbArgs : ctx.productionEffectJournal.calculateStackDepth(productionEffectsLength, producer)
        ctx.productionEffectJournal.append(new PushAggregatorProductionEffect<T>(arity, producer))

        return Result.Parsed
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

export { productNT, ProductNT }
