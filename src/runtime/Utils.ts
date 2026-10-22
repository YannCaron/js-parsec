import Context from "./Context.ts"
import { Result } from "./Result.ts"
import { TokenType } from "./TokenType.ts"
import { Parsem } from "../Parsem.ts"
import Token from "./Token.ts"
import { PushAggregatorInstruction, PushValueInstruction } from "./InstructionTapeManager.ts"

export default class Utils {

    static handleSeedGrowing<T>(_parsem: Parsem<T>, ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {

        const res = lambda(ctx)

        return res;

    }

    static handleTProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (v: string) => T, type?: TokenType): Result {
        const pos = ctx.sourceManager.pos
        ctx.symbolManager.create()

        // run encapsulated lambda
        const res = lambda(ctx)

        const builder = ctx.symbolManager.consume()

        if (res !== Result.Parsed)
            return res

        if (!builder) return res

        const symbol = builder.toString()
        const token = new Token(symbol, pos, type);

        ctx.tokenManager.append(token)

        ctx.instructionTapeManager.append(new PushValueInstruction<T>(symbol, producer))

        return Result.Parsed
    }

    static handleNTProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (...v: Array<T>) => T, nbArgs?: number): Result {

        const tapeLength = ctx.instructionTapeManager.length

        // run encapsulated lambda
        const res = lambda(ctx)

        if (res !== Result.Parsed || !producer)
            return res

        const arity = nbArgs !== undefined ? nbArgs : ctx.instructionTapeManager.calculateStackDepth(tapeLength, producer)
        ctx.instructionTapeManager.append(new PushAggregatorInstruction<T>(arity, producer))

        return Result.Parsed
    }
}
