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
import { productNT } from '../src/productNT.ts'

describe('productNT basic functions', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n
    const A = n.productNT()

    test('test "1"', () => {
        const ctx = new Context<number>("1")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [1])
        assert.strictEqual(ctx.productionManager.result, 1)
    })

    test('test toString', () => {
        assert.strictEqual(A.toString(), "[0123456789]+")
    })

})

describe('productNT rest lambda', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n (',' n)*
    const A = sequence(n, optional(repeat(sequence(charIn(','), n)))).productNT((...n) => n)

    test('test "1,2,3,4"', () => {
        const ctx = new Context<number>("1,2,3,4")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [[1, 2, 3, 4]])
        assert.deepStrictEqual(ctx.productionManager.result, [1, 2, 3, 4])
    })

})

describe('simple grammar productNT', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n ('+' n)*
    const A = sequence(n, optional(repeat(sequence(charIn('+'), n).productNT((l, r) => l + r))))

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [1])
        assert.strictEqual(ctx.productionManager.result, 1)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1+2")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [3])
        assert.strictEqual(ctx.productionManager.result, 3)
    })


    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1+2+3+4")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [10])
        assert.strictEqual(ctx.productionManager.result, 10)
    })

})

describe('operator grammar productNT', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // a = '+'
    const a = charIn('+').productT(() => (l: number, r: number) => l + r)
    // m = '-'
    const m = charIn('-').productT(() => (l: number, r: number) => l - r)
    // A = n (a | m  n)*
    const A =
        sequence(
            n,
            optional(
                repeat(
                    sequence<any>(
                        choice(a, m),
                        n
                    ).productNT<any>((l, op, r) =>
                        op(l, r)))))

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [1])
        assert.strictEqual(ctx.productionManager.result, 1)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1-2")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [-1])
        assert.strictEqual(ctx.productionManager.result, -1)
    })


    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1+2-3+4")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [4])
        assert.strictEqual(ctx.productionManager.result, 4)
    })

})

describe('operator level grammar productNT', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    const E = expression()
    // a = '+'
    const a = charIn('+').productT(() => (l:number, r:number) => l + r)
    // m = '-'
    const m = charIn('-').productT(() => (l:number, r:number) => l - r)
    // x = '*'
    const x = charIn('*').productT(() => (l:number, r:number) => l * r)
    // d = '/'
    const d = charIn('/').productT(() => (l:number, r:number) => l / r)
    // M = n (x | d  n)*
    const M = sequence(E, optional(repeat(sequence(choice(x, d), E).productNT<any>((l, op, r) => op(l, r)))))
    // A = M (a | m  M)*
    const A = sequence(M, optional(repeat(sequence(choice(a, m), M).productNT<any>((l, op, r) => op(l, r)))))
    // E = '(' A ')' | n
    E.ref = choice(sequence(charIn('('), A, charIn(')')), n)

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [1])
        assert.strictEqual(ctx.productionManager.result, 1)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1*2")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [2])
        assert.strictEqual(ctx.productionManager.result, 2)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1+2*3-4")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [3])
        assert.strictEqual(ctx.productionManager.result, 3)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("(1+2)*3-4")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [5])
        assert.strictEqual(ctx.productionManager.result, 5)
    })

})

describe('operator level and blank grammar productNT', () => {

    // _ = [ \t\n\r\l]*
    const _ = repeat(optional(charIn(' \t\n\r')))
    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    const E = expression()
    // a = '+'
    const a = charIn('+').productT(() => (l:number, r:number) => l + r)
    // m = '-'
    const m = charIn('-').productT(() => (l:number, r:number) => l - r)
    // x = '*'
    const x = charIn('*').productT(() => (l:number, r:number) => l * r)
    // d = '/'
    const d = charIn('/').productT(() => (l:number, r:number) => l / r)
    // M = n (x | d  n)*
    const M = sequence(_, E, optional(repeat(sequence(_, choice(x, d), _, E, _).productNT<any>((l, op, r) => op(l, r)))))
    // A = M (a | m  M)*
    const A = sequence(_, M, optional(repeat(sequence(_, choice(a, m), _, M, _).productNT<any>((l, op, r) => op(l, r)))))
    // E = '(' A ')' | n
    E.ref = choice(sequence(charIn('('), _, A, _, charIn(')')), n)

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>(" ( 1 + 2 ) * 3 - 4 ")
        assert.strictEqual(A.parse(ctx), Result.Parsed)
        A.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [5])
        assert.strictEqual(ctx.productionManager.result, 5)
    })

})

describe('productNT argument extraction edge cases', () => {

    test('productNT should support 0-arg producer function', () => {
        const parser = productNT(charIn('a'), () => 42)
        const ctx = new Context<number>("a")

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        parser.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [42])
    })

    test('productNT should respect explicit nbArgs = 0', () => {
        const parser = productNT(charIn('a'), () => 99, 0)
        const ctx = new Context<number>("a")

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        parser.build(ctx)

        assert.deepStrictEqual(ctx.productionManager.stack, [99])
    })

})
