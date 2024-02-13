import Context from "../src/runtime/Context";
import { expression } from "../src/expression";
import charIn from "../src/charIn";
import choice from "../src/choice";
import optional from "../src/optional";
import repeat from "../src/repeat";
import sequence from "../src/sequence";
import Result from "../src/runtime/Result";

describe('Expression basic functions', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n ('+' n)*
    const A = expression()
    A.ref = n

    test('test toString', () => {
        expect(A.toString()).toBe("[0123456789]+")
    })

})

describe('operator level grammar Expression', () => {

    const E = expression()

    // n = [0-9]+
    const n = expression()
    n.ref = repeat(charIn('0123456789')).productT(v => Number(v))

    // a = '+'
    const a = expression(charIn('+').productT(() => (l, r) => l + r))

    // m = '-'
    const m = expression()
    m.ref = charIn('-').productT(() => (l, r) => l - r)

    // x = '*'
    const x = expression()
    x.ref = charIn('*').productT(() => (l, r) => l * r)

    // d = '/'
    const d = expression()
    d.ref = charIn('/').productT(() => (l, r) => l / r)

    // M = n (x | d  n)*
    const M = expression(sequence(E, optional(repeat(sequence(choice(x, d), E).productNT<any>((l, op, r) => op(l, r))))))

    // A = M (a | m  M)*
    const A = expression()
    A.ref = sequence(M, optional(repeat(sequence(choice(a, m), M).productNT<any>((l, op, r) => op(l, r)))))
    
    // E = '(' A ')' | n
    E.ref = choice(sequence(charIn('('), A, charIn(')')), n)

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([ 1 ])
        expect(ctx.result).toBe(1)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1*2")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([ 2 ])
        expect(ctx.result).toBe(2)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("1+2*3-4")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([ 3 ])
        expect(ctx.result).toBe(3)
    })

    test('product should parse arithmetic expression', () => {
        const ctx = new Context<number>("(1+2)*3-4")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([ 5 ])
        expect(ctx.result).toBe(5)
    })

})