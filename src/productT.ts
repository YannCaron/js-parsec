import Context from "./runtime/Context.ts"
import { Parsem, ParsemDecorator } from "./Parsem.ts"
import { TokenType } from "./runtime/TokenType.ts"
import Token from "./runtime/Token.ts"
import { Result } from "./runtime/Result.ts"

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

        return Context.handleTProduction<T>(
            ctx, ctx => this.decorated.parse(ctx),
            this._producer,
            this._type
        )

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

export {productT, ProductT}
