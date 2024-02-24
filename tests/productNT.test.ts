import Context from "../src/runtime/Context";
import { expression } from "../src/expression";
import charIn from "../src/charIn";
import choice from "../src/choice";
import optional from "../src/optional";
import repeat from "../src/repeat";
import sequence from "../src/sequence";
import Result from "../src/runtime/Result";
import '../src/productT'
import '../src/productNT'

describe('productNT basic functions', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n
    const A = n.productNT()

    test('test "1"', () => {
        const ctx = new Context<number>("1")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([1])
        expect(ctx.result).toBe(1)
    })

    test('test toString', () => {
        expect(A.toString()).toBe("[0123456789]+")
    })

})

describe('productNT rest lambda', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n (',' n)*
    const A = sequence(n, optional(repeat(sequence(charIn(','), n)))).productNT((...n) => n)

    test('test "1,2,3,4"', () => {
        const ctx = new Context<number>("1,2,3,4")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([[1, 2, 3, 4]])
        expect(ctx.result).toStrictEqual([1, 2, 3, 4])
    })

})

describe('simple grammar productNT', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n ('+' n)*
    const A = sequence(n, optional(repeat(sequence(charIn('+'), n).productNT((l, r) => l + r))))

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([1])
        expect(ctx.result).toBe(1)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1+2")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([3])
        expect(ctx.result).toBe(3)
    })


    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1+2+3+4")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([10])
        expect(ctx.result).toBe(10)
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
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([1])
        expect(ctx.result).toBe(1)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1-2")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([-1])
        expect(ctx.result).toBe(-1)
    })


    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1+2-3+4")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([4])
        expect(ctx.result).toBe(4)
    })

})

describe('operator level grammar productNT', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    const E = expression()
    // a = '+'
    const a = charIn('+').productT(() => (l, r) => l + r)
    // m = '-'
    const m = charIn('-').productT(() => (l, r) => l - r)
    // x = '*'
    const x = charIn('*').productT(() => (l, r) => l * r)
    // d = '/'
    const d = charIn('/').productT(() => (l, r) => l / r)
    // M = n (x | d  n)*
    const M = sequence(E, optional(repeat(sequence(choice(x, d), E).productNT<any>((l, op, r) => op(l, r)))))
    // A = M (a | m  M)*
    const A = sequence(M, optional(repeat(sequence(choice(a, m), M).productNT<any>((l, op, r) => op(l, r)))))
    // E = '(' A ')' | n
    E.ref = choice(sequence(charIn('('), A, charIn(')')), n)

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([1])
        expect(ctx.result).toBe(1)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1*2")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([2])
        expect(ctx.result).toBe(2)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1+2*3-4")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([3])
        expect(ctx.result).toBe(3)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("(1+2)*3-4")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([5])
        expect(ctx.result).toBe(5)
    })

})

describe('operator level and blank grammar productNT', () => {

    // _ = [ \t\n\r\l]*
    const _ = repeat(optional(charIn(' \t\n\r')))
    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    const E = expression()
    // a = '+'
    const a = charIn('+').productT(() => (l, r) => l + r)
    // m = '-'
    const m = charIn('-').productT(() => (l, r) => l - r)
    // x = '*'
    const x = charIn('*').productT(() => (l, r) => l * r)
    // d = '/'
    const d = charIn('/').productT(() => (l, r) => l / r)
    // M = n (x | d  n)*
    const M = sequence(_, E, optional(repeat(sequence(_, choice(x, d), _, E, _).productNT<any>((l, op, r) => op(l, r)))))
    // A = M (a | m  M)*
    const A = sequence(_, M, optional(repeat(sequence(_, choice(a, m), _, M, _).productNT<any>((l, op, r) => op(l, r)))))
    // E = '(' A ')' | n
    E.ref = choice(sequence(charIn('('), _, A, _, charIn(')')), n)

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>(" ( 1 + 2 ) * 3 - 4 ")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([5])
        expect(ctx.result).toBe(5)
    })

})