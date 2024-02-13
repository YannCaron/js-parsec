import charIn from "../src/charIn";
import optional from "../src/optional";
import Context from "../src/runtime/Context";
import Result from "../src/runtime/Result";


describe('basic optional', () => {

    const parser = optional(charIn("ab"))

    test('optional should parse "a"', () => {
        const ctx = new Context("a")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('optional should parse "b"', () => {
        const ctx = new Context("b")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('optional should not parse "c"', () => {
        const ctx = new Context("c")
        expect(parser.parse(ctx)).toBe(Result.Continue);
    })

})