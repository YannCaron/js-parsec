import { Parsem } from "../Parsem";
import Context from "./Context";
import { Instruction } from "./InstructionTapeManager";
import { Result } from "./Result";

type Key<T> = { 
    pos: number, 
    parser: Parsem<T> 
}

type ResultEntry<T> = { 
    newPos: number, 
    result:Result,
    tapDelta: Array<Instruction<T>>
}

export default class MemoizerHandler<T> {

    private readonly _memoizer: Map<Key<T>, ResultEntry<T>>

    constructor() {
        this._memoizer = new Map<Key<T>, ResultEntry<T>>()
    }

    handle(_parsem: Parsem<T>, ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {

        const tapePos = ctx.instructionTapeManager.length

        const res = lambda(ctx)

        const delta = ctx.instructionTapeManager.subTapeFrom(tapePos)

        return res;
    }

}