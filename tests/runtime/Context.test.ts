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
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [1, 2, 3, 4])
        assert.deepStrictEqual(ctx.productionManager.result, [1, 2, 3, 4])
    })

})

describe('Context parsing status', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n ',' n
    const A = sequence(n, sequence(charIn(','), n))

    test('should parse "1,2"', () => {
        const ctx = new Context<number>("1,2")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
    })

    test('should reject "1," even when all source characters were consumed', () => {
        const ctx = new Context<number>("1,")
        assert.strictEqual(A.parse(ctx), Result.NotParsed)
        assert.strictEqual(ctx.sourceManager.current, null)
    })

})

describe('Context uniqueResult array preservation', () => {

    test('uniqueResult should preserve single produced array', () => {
        const ctx = new Context<Array<string>>("a")
        const parser = charIn('a').productT(() => ['first', 'second'])

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        parser.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.uniqueResult, ['first', 'second'])
    })

})
