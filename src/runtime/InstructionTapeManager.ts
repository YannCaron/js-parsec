import { Functions, Queue } from "@cyann/js-commons"
import Context from "./Context.ts"

export abstract class Instruction<T> {

    abstract apply(ctx: Context<T>): void

    abstract get stackEffect(): number

    abstract get producer() : ((v: string) => T) | ((...v: Array<T>) => T) | undefined

}

export class PushValueInstruction<T> extends Instruction<T> {

    private readonly _symbol: string
    private readonly _producer?: (v: string) => T

    get stackEffect(): number {
        return 1
    }
    
    get symbol() : string {
        return this._symbol
    }
    
    get producer() : ((v: string) => T) | undefined {
        return this._producer
    }
    
    constructor(symbol: string, producer?: (v: string) => T) {
        super()
        this._symbol = symbol
        this._producer = producer
    }

    apply(ctx: Context<T>): void {
        const procuct = this._producer != undefined ? this._producer(this._symbol) : this._symbol as T
        ctx.productionManager.append(procuct)
    }

}

export class PushAggregatorInstruction<T> extends Instruction<T> {

    private readonly _arity: number
    private readonly _producer: (...v: Array<T>) => T

    get stackEffect(): number {
        return 1 - this._arity
    }

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
    private readonly _stackDepths: number[] = [0]

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

    append(...instructions: Array<Instruction<T>>): void {
        let depth = this._stackDepths[this._stackDepths.length - 1]

        for (const instruction of instructions) {
            depth += instruction.stackEffect
            this._queue.push(instruction)
            this._stackDepths.push(depth)
        }
    }

    subTapeFrom(start: number): Array<Instruction<T>> {
        return this._queue.slice(start)
    }

    removeFrom(start: number): void {
        this._queue.splice(start)
        this._stackDepths.length = start + 1
    }

    calculateStackDepth(startPos: number, producer: (...v: Array<T>) => T): number {
        const producerArgs = Functions.extractArguments(producer)
        if (producerArgs.length === 0) return 0

        if (!Functions.hasRestArgument(producerArgs)) {
            return producerArgs.length
        }

        const delta = this._stackDepths[this._stackDepths.length - 1] - this._stackDepths[startPos]
        return delta + producerArgs.length - 1
    }

}
