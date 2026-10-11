import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import Context from "../../src/runtime/Context.ts"
import charIn from "../../src/charIn.ts"
import optional from "../../src/optional.ts"
import repeat from "../../src/repeat.ts"
import sequence from "../../src/sequence.ts"
import { Result } from "../../src/runtime/Result.ts"
import '../../src/productT.ts'

describe('basic Context', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n (',' n)*
    const A = sequence(n, optional(repeat(sequence(charIn(','), n))))

    test('should parse "1,2,3,4"', () => {
        const ctx = new Context<number>("1,2,3,4")
        assert.strictEqual(A.parse(ctx), Result.Parsed)

        assert.deepStrictEqual(ctx.stack, [1, 2, 3, 4])
        assert.deepStrictEqual(ctx.result, [1, 2, 3, 4])
    })

})

describe('exception Context', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n (',' n)*
    const A = sequence(n, sequence(charIn(','), n))

    test('should parse "1,2"', () => {
        const ctx = new Context<number>("1,2")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
    })

    test('should not parse "1," and throw error', () => {
        const ctx = new Context<number>("1,")
        A.parse(ctx)
        assert.throws(() => { return ctx.result }, Error)
    })

})