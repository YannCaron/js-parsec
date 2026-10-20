import { Stack } from "@cyann/js-commons"
import Context from "./Context.ts"
import Token from "./Token.ts"
import { Result } from "./Result.ts"

export abstract class Transaction<T> {
    abstract apply(ctx: Context<T>): void
    abstract reverse(ctx: Context<T>): void
}

export class TokenTransaction<T> extends Transaction<T> {

    private readonly _token: Token

    constructor(token: Token) {
        super()
        this._token = token
    }

    apply(ctx: Context<T>): void {
        ctx.tokenManager.append(this._token)
    }

    reverse(ctx: Context<T>): void {
        ctx.tokenManager.consume()
    }

}

export class ProductTransaction<T> extends Transaction<T> {

    private readonly _product: T

    constructor(product: T) {
        super()
        this._product = product
    }

    apply(ctx: Context<T>): void {
        ctx.productionManager.append(this._product)
    }

    reverse(ctx: Context<T>): void {
        ctx.productionManager.consume()
    }

}


export class ConsumeTransaction<T> extends Transaction<T> {

    private readonly _product: T

    constructor(product: T) {
        super()
        this._product = product
    }

    apply(ctx: Context<T>): void {
        ctx.productionManager.consume()
    }

    reverse(ctx: Context<T>): void {
        ctx.productionManager.append(this._product)
    }

}

export default class TransactionManager<T> {

    readonly _stacks: Stack<Transaction<T>[]>

    get isActive(): boolean {
        return !this._stacks.isEmpty
    }

    constructor() {
        this._stacks = new Stack<Transaction<T>[]>()
    }

    append(transaction: Transaction<T>): void {
        if (!this.isActive) throw new Error(`Cannot create transation on an empty transaction stack.`)

        this._stacks.last.push(transaction)
    }

    create() {
        this._stacks.push(new Array<Transaction<T>>())
    }

    consume(): Transaction<T>[] {
        const stack = this._stacks.pop()

        if (stack === undefined)
            throw new Error(`Cannot consume empty transaction stack!`)

        return stack
    }

    manage(ctx: Context<T>, lambda: (ctx: Context<T>) => Result): { res: Result, transactions: Transaction<T>[] } {

        this.create()

        const res = lambda(ctx)

        const transactions: Array<Transaction<T>> = this.consume()

        return { res, transactions }
    }
}