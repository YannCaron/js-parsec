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

    /**
     * Validate the number of operands before mutating the production stack.
     * A reducer can intentionally consume values emitted before its own rule,
     * so the guard checks the current stack, not just the rule-local delta.
     */
    assertCanConsume(required: number): void {
        if (!Number.isInteger(required) || required < 0)
            throw new RangeError('Aggregation arity must be a non-negative integer.')

        const available = this.pos
        if (required > available)
            throw new Error(
                `Production stack underflow: required=${required}, available=${available}. ` +
                'Check the semantic action arity and whether the matched expressions produce values.'
            )
    }

    consume(): T {
        this.assertCanConsume(1)
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

        this.assertCanConsume(count)

        while (count > 0) {
            const value = this.consume()
            args.unshift(value)
            count--
        }

        this.append(producer(...args))
    }

}
