import { Functions, Queue } from "@cyann/js-commons"
import Context from "./Context.ts"

abstract class Instruction<T> {

    abstract apply(ctx: Context<T>): void

}

export class PushValueInstruction<T> extends Instruction<T> {

    private readonly _value: T

    get value(): T {
        return this._value
    }

    constructor(value: T) {
        super()
        this._value = value
    }

    apply(ctx: Context<T>): void {
        ctx.productionManager.append(this._value)
    }

}

export class PushAggregatorInstruction<T> extends Instruction<T> {

    private readonly _arity: number
    private readonly _producer: (...v: Array<T>) => T

    get arity(): number {
        return this._arity
    }

    get producer(): (...v: Array<T>) => T {
        return this._producer
    }

    constructor(arity: number, producer: (...v: Array<T>) => T) {
        super()
        this._arity = arity
        this._producer = producer
    }

    apply(ctx: Context<T>): void {
        const args = new Array<T>()
        let count = this._arity

        while (count > 0) {
            const value = ctx.productionManager.consume()
            if (value === undefined) break
            args.unshift(value)
            count--
        }

        const product = this._producer(...args)
        ctx.productionManager.append(product)
    }

}

export default class InstructionTapeManager<T> {

    private readonly _queue: Queue<Instruction<T>>

    get queue(): Queue<Instruction<T>> {
        return this._queue
    }

    get length(): number {
        return this._queue.length
    }

    constructor() {
        this._queue = new Queue<Instruction<T>>
    }

    apply(ctx: Context<T>) {
        for (const instruction of this.queue) {
            instruction.apply(ctx)
        }
    }

    append(instruction: Instruction<T>) {
        this._queue.push(instruction)
    }

    subTapeFrom(start: number): Array<Instruction<T>> {
        return this._queue.slice(start)
    }

    removeFrom(start: number) {
        this._queue.splice(start)
    }

    calculateStackDepth(startPos: number, producer: (...v: Array<T>) => T): number {
        const delta = this._queue.length - startPos
        const producerArgs = Functions.extractArguments(producer)
        if (producerArgs.length === 0) return 0
        const hasRest = Functions.hasRestArgument(producerArgs)

        return hasRest ?
            delta + producerArgs.length - 1 :
            producerArgs.length
    }

}