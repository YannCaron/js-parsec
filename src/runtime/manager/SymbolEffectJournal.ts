import { Queue } from "@cyann/js-commons"
import type Context from "../Context.ts"
import { Result } from "../Result.ts"
import Token from "../Token.ts"
import type { TokenType } from "../TokenType.ts"

export abstract class SymbolInstruction<T> {

    abstract apply(ctx: Context<T>): void

}

export class ReadSymbolInstruction<T> extends SymbolInstruction<T> {

    private readonly _start: number
    private readonly _end: number

    get start(): number {
        return this._start
    }

    get end(): number {
        return this._end
    }

    constructor(start: number, end: number) {
        super()
        this._start = start
        this._end = end
    }

    apply(ctx: Context<T>): void {
        ctx.sourceManager.pos = this._start

        for (let pos = this._start; pos < this._end; pos++) {
            ctx.next()
        }
    }

}

export class BeginCaptureInstruction<T> extends SymbolInstruction<T> {

    apply(ctx: Context<T>): void {
        ctx.symbolManager.create()
    }

}

export class EndCaptureInstruction<T> extends SymbolInstruction<T> {

    private readonly _start: number
    private readonly _res: Result
    private readonly _type?: TokenType

    constructor(start: number, res: Result, type?: TokenType) {
        super()
        this._start = start
        this._res = res
        this._type = type
    }

    apply(ctx: Context<T>): string | undefined {
        const builder = ctx.symbolManager.consume()

        if (this._res !== Result.Parsed || !builder) return

        const symbol = builder.toString()
        ctx.tokenManager.append(new Token(symbol, this._start, this._type))
        return symbol
    }

}

export default class SymbolEffectJournal<T> {

    private readonly _ctx: Context<T>
    private readonly _queue: Queue<SymbolInstruction<T>>
    private _recordDepth: number
    private _replaying: boolean

    get length(): number {
        return this._queue.length
    }

    constructor(ctx: Context<T>) {
        this._ctx = ctx
        this._queue = new Queue<SymbolInstruction<T>>()
        this._recordDepth = 0
        this._replaying = false
    }

    startRecording(): number {
        this._recordDepth++
        return this.length
    }

    stopRecording(): void {
        this._recordDepth--

        if (this._recordDepth === 0)
            this.removeFrom(0)
    }

    recordRead(start: number, end: number): void {
        if (this._recordDepth === 0 || this._replaying) return

        this.append(new ReadSymbolInstruction<T>(start, end))
    }

    beginCapture(): void {
        const instruction = new BeginCaptureInstruction<T>()
        instruction.apply(this._ctx)
        this.append(instruction)
    }

    endCapture(start: number, res: Result, type?: TokenType): string | undefined {
        const instruction = new EndCaptureInstruction<T>(start, res, type)
        const symbol = instruction.apply(this._ctx)
        this.append(instruction)
        return symbol
    }

    replay(instructions: readonly SymbolInstruction<T>[]): void {
        try {
            this._replaying = true

            for (const instruction of instructions) {
                instruction.apply(this._ctx)
            }
        } finally {
            this._replaying = false
        }

        // Keep cached children in the enclosing recording, without recording their reads twice.
        this.append(...instructions)
    }

    private append(...instructions: SymbolInstruction<T>[]): void {
        if (this._recordDepth === 0 || this._replaying) return

        for (const instruction of instructions) {
            this._queue.push(instruction)
        }
    }

    subJournalFrom(start: number): Array<SymbolInstruction<T>> {
        const instructions = new Array<SymbolInstruction<T>>()

        // Compact the fragment without changing active recording and rollback positions.
        for (let i = start; i < this.length; i++) {
            const instruction = this._queue[i]

            if (instruction instanceof ReadSymbolInstruction) {
                let end = instruction.end
                let next = this._queue[i + 1]

                while (next instanceof ReadSymbolInstruction && next.start === end) {
                    end = next.end
                    i++
                    next = this._queue[i + 1]
                }

                instructions.push(end === instruction.end ? instruction : new ReadSymbolInstruction<T>(instruction.start, end))
            } else {
                instructions.push(instruction)
            }
        }

        return instructions
    }

    removeFrom(start: number): void {
        this._queue.splice(start)
    }

}
