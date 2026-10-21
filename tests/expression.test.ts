import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import Context from "../src/runtime/Context.ts";
import { expression } from "../src/expression.ts";
import charIn from "../src/charIn.ts";
import choice from "../src/choice.ts";
import optional from "../src/optional.ts";
import repeat from "../src/repeat.ts";
import sequence from "../src/sequence.ts";
import { Result } from "../src/runtime/Result.ts";
import '../src/productT.ts'
import '../src/productNT.ts'

describe('Expression basic functions', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n ('+' n)*
    const A = expression()
    A.ref = n

    test('test toString', () => {
        assert.strictEqual(A.toString(), "[0123456789]+")
    })

})

describe('operator level grammar Expression', () => {

    const E = expression()

    // n = [0-9]+
    const n = expression()
    n.ref = repeat(charIn('0123456789')).productT(v => Number(v))

    // a = '+'
    const a = expression(charIn('+').productT(() => (l:number, r:number) => l + r))

    // m = '-'
    const m = expression()
    m.ref = charIn('-').productT(() => (l:number, r:number) => l - r)

    // x = '*'
    const x = expression()
    x.ref = charIn('*').productT(() => (l:number, r:number) => l * r)

    // d = '/'
    const d = expression()
    d.ref = charIn('/').productT(() => (l:number, r:number) => l / r)

    // M = n (x | d  n)*
    const M = expression(sequence(E, optional(repeat(sequence(choice(x, d), E).productNT<any>((l, op, r) => op(l, r))))))

    // A = M (a | m  M)*
    const A = expression()
    A.ref = sequence(M, optional(repeat(sequence(choice(a, m), M).productNT<any>((l, op, r) => op(l, r)))))
    
    // E = '(' A ')' | n
    E.ref = choice(sequence(charIn('('), A, charIn(')')), n)

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [ 1 ])
        assert.strictEqual(ctx.productionManager.result, 1)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1*2")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [ 2 ])
        assert.strictEqual(ctx.productionManager.result, 2)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1+2*3-4")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [ 3 ])
        assert.strictEqual(ctx.productionManager.result, 3)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("(1+2)*3-4")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [ 5 ])
        assert.strictEqual(ctx.productionManager.result, 5)
    })

})

describe('uninitialized expression error handling', () => {

    test('uninitialized expression should throw error on parse', () => {
        const E = expression()
        const ctx = new Context("abc")

        assert.throws(() => E.parse(ctx), Error)
    })

})
