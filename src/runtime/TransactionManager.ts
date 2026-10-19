import { Stack } from "@cyann/js-commons"
import Context from "./Context.ts"
import Token from "./Token.ts"
import { Result } from "./Result.ts"

export abstract class Transaction<T> {
    abstract apply(ctx: Context<T>): void
    abstract reverse(ctx: Context<T>): void
}

export class TokenTransaction<T> extends Transaction<T> {

    private readonly token: Token

    constructor(token: Token) {
        super()
        this.token = token
    }

    apply(ctx: Context<T>): void {
        ctx.appendToken(this.token)
    }

    reverse(ctx: Context<T>): void {
        ctx._tokens.pop()
    }

}

export class ProductTransaction<T> extends Transaction<T> {

    private readonly production: T

    constructor(production: T) {
        super()
        this.production = production
    }

    apply(ctx: Context<T>): void {
        ctx._stack.push(this.production)
    }

    reverse(ctx: Context<T>): void {
        ctx._stack.pop()
    }

}


export default class TransactionManager<T> {

    readonly _stacks: Stack<Transaction<T>[]>

    constructor() {
        this._stacks = new Stack<Transaction<T>[]>()
    }

    append(transaction: Transaction<T>): void {
        if (this._stacks.last !== undefined)
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