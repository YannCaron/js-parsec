import { Stack } from "@cyann/js-commons"
import Context from "./Context"
import Token from "./Token"
import { Result } from "./Result"

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

export default function transaction<T>(lambda: (ctx: Context<T>) => Result): Transaction<T>[] {
    const _stack: Stack<Transaction<T>> = new Stack()

    return _stack
}
