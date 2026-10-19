import { Functions, Stack } from '@cyann/js-commons'

export default class ProductionManager<T> {

    readonly _stack: Stack<T>

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

    constructor() {
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
        let count = nbArgs !== undefined ? nbArgs : this.calculateStackDepth(startPos, producer)

        while (count > 0 && !this._stack.isEmpty) {
            const value = this.consume()
            if (value === undefined) break
            args.unshift(value)
            count--
        }

        this.append(producer(...args))
    }

}
