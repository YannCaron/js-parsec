import { Functions, Stack } from '@cyann/js-commons'
import Context from './Context.ts'
import { ConsumeTransaction, ProductTransaction } from './TransactionManager.ts'

export default class ProductionManager<T> {

    private readonly _ctx: Context<T>
    private readonly _stack: Stack<T>

    get stack(): Array<T> {
        return [...this._stack]
    }

    get pos(): number {
        return this._stack.length
    }

    set pos(value: number) {
        this._stack.splice(value)
    }

    get result(): Array<T> | T {
        if (this._stack.length === 1)
            return this._stack.last

        return this.stack
    }

    get uniqueResult(): T {
        if (this._stack.length === 1)
            return this._stack.last

        return this._stack.first
    }

    constructor(ctx: Context<T>) {
        this._ctx = ctx
        this._stack = new Stack<T>()
    }

    append(production: T): void {
        this._stack.push(production)
    }

    consume(): T | undefined {
        return this._stack.pop()
    }

    restore(stack: Array<T>): void {
        this._stack.splice(0, this._stack.length, ...stack)
    }

    calculateStackDepth(startPos: number, producer: (...v: Array<T>) => T): number {
        const delta = this.pos - startPos
        const producerArgs = Functions.extractArguments(producer)
        if (producerArgs.length === 0) return 0
        const hasRest = Functions.hasRestArgument(producerArgs)

        return hasRest ?
            delta + producerArgs.length - 1 :
            producerArgs.length
    }

    produce(startPos: number, producer: (...v: Array<T>) => T, nbArgs?: number): void {
        const args = new Array<T>()
        let count = nbArgs ?? this.calculateStackDepth(startPos, producer)

        while (count > 0 && !this._stack.isEmpty) {
            const arg = this.consume()
            if (arg === undefined) break
            args.unshift(arg)

            if (this._ctx.transactionManager.isActive)
                this._ctx.transactionManager.append(new ConsumeTransaction(arg))

            count--
        }

        const product = producer(...args)
        this.append(product)

        if (this._ctx.transactionManager.isActive) {
            this._ctx.transactionManager.append(new ProductTransaction(product))
        }
    }

}
