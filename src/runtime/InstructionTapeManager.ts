import { Functions, Queue } from "@cyann/js-commons"

abstract class Instruction<T> {

    // TODO: apply to send to stack

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

}

export default class InstructionTapeManager<T> {

    private _queue: Queue<Instruction<T>>

    get queue(): Queue<Instruction<T>> {
        return this._queue
    }

    get length(): number {
        return this._queue.length
    }

    constructor() {
        this._queue = new Queue<Instruction<T>>
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