import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import Context from "../src/runtime/Context.ts";
import { expression } from "../src/expression.ts";
import charIn from "../src/charIn.ts";
import choice from "../src/choice.ts";
import optional from "../src/optional.ts";
import repeat from "../src/repeat.ts";
import sequence from "../src/sequence.ts";
import wordIs from "../src/wordIs.ts";
import { Result } from "../src/runtime/Result.ts";
import '../src/productT.ts'
import '../src/productNT.ts'

describe('Expression basic functions', () => {

    test('accepts a name and receives its reference after construction', () => {
        const rule = expression<string>('Letter')
        assert.strictEqual(rule.name, 'Letter')
        assert.strictEqual(rule.toString(), 'Letter')
        assert.throws(() => rule.parse(new Context<string>('a')), /not initialized/i)

        const reference = wordIs<string>('a')
        rule.ref = reference
        assert.strictEqual(rule.ref, reference)
        const ctx = new Context<string>('a')
        assert.strictEqual(rule.parse(ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 1)
    })

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))

    test('test toString', () => {
        assert.strictEqual(n.toString(), "[0123456789]+")
    })

})

describe('operator level grammar Expression', () => {

    const E = expression<any>()

    // n = [0-9]+
    const n = expression<number>()
    n.ref = repeat(charIn('0123456789')).productT(v => Number(v))

    // a = '+'
    const a = expression<(l: number, r: number) => number>()
    a.ref = charIn('+').productT(() => (l:number, r:number) => l + r)

    // m = '-'
    const m = expression<(l: number, r: number) => number>()
    m.ref = charIn('-').productT(() => (l:number, r:number) => l - r)

    // x = '*'
    const x = expression<(l: number, r: number) => number>()
    x.ref = charIn('*').productT(() => (l:number, r:number) => l * r)

    // d = '/'
    const d = expression<(l: number, r: number) => number>()
    d.ref = charIn('/').productT(() => (l:number, r:number) => l / r)

    // M = n (x | d  n)*
    const M = expression<any>()
    M.ref = sequence(E, optional(repeat(sequence(choice(x, d), E).productNT<any>((l, op, r) => op(l, r)))))

    // A = M (a | m  M)*
    const A = expression<any>()
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
