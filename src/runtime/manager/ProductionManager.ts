import { Functions, Stack } from '@cyann/js-commons'
import type SourceManager from './SourceManager.ts'

export default class ProductionManager<T> {

    readonly _stack: Stack<T>
    private readonly _sourceManager: SourceManager

    // TODO, remove
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
        this._sourceManager.assertComplete()

        if (this._stack.length === 1)
            return this._stack.last

        // TODO return _stack and refactor tests
        return this.stack
    }

    get uniqueResult(): T {
        if (this.pos !== 1)
            this._sourceManager.assertComplete()

        if (this._stack.length === 1)
            return this._stack.last

        return this._stack.first
    }

    constructor(sourceManager: SourceManager) {
        this._sourceManager = sourceManager
        this._stack = new Stack<T>()
    }

    append(production: T): void {
        this._stack.push(production)
    }

    consume(): T {
        if (this._stack.isEmpty)
            throw new Error(`Production stack overflow!`)

        return this._stack.pop() as T
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
        let count = nbArgs !== undefined ? nbArgs : this.calculateStackDepth(startPos, producer)
        if (!Number.isInteger(count) || count < 0)
            throw new RangeError('Aggregation arity must be a non-negative integer.')

        while (count > 0 && !this._stack.isEmpty) {
            const value = this.consume()
            args.unshift(value)
            count--
        }

        this.append(producer(...args))
    }

}
