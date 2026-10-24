import Context from "./runtime/Context.ts"
import { Parsem, ParsemDecorator } from "./Parsem.ts"
import { TokenType } from "./runtime/TokenType.ts"
import Token from "./runtime/Token.ts"
import { Result } from "./runtime/Result.ts"
import { PushValueProductionEffect } from "./runtime/manager/ProductionEffectJournal.ts"

class ProductT<T> extends ParsemDecorator<T> {

    private readonly _producer?: (v: string) => T
    private _type: TokenType

    type(type: TokenType): this {
        this._type = type
        return this
    }

    constructor(decorated: Parsem<T>, producer?: (v: string) => T) {
        super(decorated)
        this._producer = producer
        this._type = Token.DEFAULT_TYPE
    }

    parse(ctx: Context<T>): Result {

        return ProductT.handleProduction<T>(
            ctx, ctx => this.decorated.parse(ctx),
            this._producer,
            this._type
        )

    }

    static handleProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (v: string) => T, type?: TokenType): Result {
        const pos = ctx.sourceManager.pos
        const symbolEffectsPos = ctx.symbolEffectJournal.length
        ctx.symbolEffectJournal.beginCapture()

        let res = Result.NotParsed
        let symbol: string | undefined
        try {
            res = lambda(ctx)
        } finally {
            symbol = ctx.symbolEffectJournal.endCapture(pos, res, type)
            // An empty capture contributes no effects to a Continue result.
            if (res === Result.Continue && ctx.symbolEffectJournal.length === symbolEffectsPos + 2)
                ctx.symbolEffectJournal.removeFrom(symbolEffectsPos)
        }

        if (res !== Result.Parsed)
            return res

        if (symbol === undefined) return res

        ctx.productionEffectJournal.append(new PushValueProductionEffect<T>(symbol, producer))

        return Result.Parsed
    }

    toString(): string {
        return this.decorated.toString()
    }

}

function productT<T>(decorated: Parsem<T>, producer?: (v: string) => T): ProductT<T> {
    return new ProductT(decorated, producer)
}

declare module "./Parsem" {
    interface Parsem<T> {
        productT<T>(producer?: (v: string) => T): ProductT<T>
    }
}

Parsem.prototype.productT = function <T>(producer?: (v: string) => T) {
    return productT<T>(this, producer)
}

export { productT, ProductT }
