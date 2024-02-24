import Context from "../../src/runtime/Context"
import charIn from "../../src/charIn"
import optional from "../../src/optional"
import repeat from "../../src/repeat"
import sequence from "../../src/sequence"
import Result from "../../src/runtime/Result"
import '../../src/productT'

describe('basic Context', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n (',' n)*
    const A = sequence(n, optional(repeat(sequence(charIn(','), n))))

    test('should parse "1,2,3,4"', () => {
        const ctx = new Context<number>("1,2,3,4")
        expect(A.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.stack).toStrictEqual([1, 2, 3, 4])
        expect(ctx.result).toStrictEqual([1, 2, 3, 4])
    })

})

describe('exception Context', () => {

    // n = [0-9]+
    const n = repeat(charIn('0123456789')).productT(v => Number(v))
    // A = n (',' n)*
    const A = sequence(n, sequence(charIn(','), n))

    test('should parse "1,2"', () => {
        const ctx = new Context<number>("1,2")
        expect(A.parse(ctx)).toBe(Result.Parsed)
    })

    test('should not parse "1," and throw error', () => {
        const ctx = new Context<number>("1,")
        A.parse(ctx)
        expect(() => { return ctx.result }).toThrow(Error)
    })

})