import charIn from "../src/charIn"
import Context from "../src/runtime/Context"
import Result from "../src/runtime/Result"

describe('basic charIn', () => {

    const parser = charIn("ab")

    test('charin should parse "a"', () => {
        const ctx = new Context("a")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('charin should parse "b"', () => {
        const ctx = new Context("b")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('charin should not parse "c"', () => {
        const ctx = new Context("c")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

})