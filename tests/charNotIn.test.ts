import charIn from "../src/charIn";
import charNotIn from "../src/charNotIn";
import repeat from "../src/repeat";
import Context from "../src/runtime/Context";
import Result from "../src/runtime/Result";
import sequence from "../src/sequence";

describe('basic charNotIn', () => {

    const parser = charNotIn("ab")

    test('charNotIn should charNotIn parse "a"', () => {
        const ctx = new Context("a")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

    test('charNotIn should charNotIn parse "b"', () => {
        const ctx = new Context("b")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

    test('charNotIn should parse "c"', () => {
        const ctx = new Context("c")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

})

describe('sequence charNotIn', () => {

    const parser = sequence(charIn('c'), charNotIn("ab"), charIn('c'))

    test('charNotIn should charNotIn parse "cac"', () => {
        const ctx = new Context("cac")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

    test('charNotIn should charNotIn parse "cbc"', () => {
        const ctx = new Context("cbc")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

    test('charNotIn should parse "ccc"', () => {
        const ctx = new Context("ccc")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })


})

describe('literal', () => {

    const parser = sequence(charIn('"'), repeat(charNotIn('"')), charIn('"'))

    test('should parse "my string"', () => {
        const ctx = new Context(`"my string"`)
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })


})

describe('toString', () => {

    const parser = sequence(charIn('"'), repeat(charNotIn('"')), charIn('"'))

    test('should parse "my string"', () => {
        expect(parser.toString()).toBe(`(["] [^"]+ ["])`);
    })


})