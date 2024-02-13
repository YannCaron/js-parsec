import charIn from "../src/charIn";
import optional from "../src/optional";
import repeat from "../src/repeat";
import Context from "../src/runtime/Context";
import Result from "../src/runtime/Result";
import sequence from "../src/sequence";

describe('basic repeat', () => {

    const parser = repeat(charIn("a"))

    test('repeat should parse "a"', () => {
        const ctx = new Context("a")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('repeat should parse "aa"', () => {
        const ctx = new Context("aa")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('repeat should parse "aaa"', () => {
        const ctx = new Context("aaa")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('repeat should not parse "b"', () => {
        const ctx = new Context("b")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

    test('repeat should not parse ""', () => {
        const ctx = new Context("")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

})

describe('combination repeat/optional', () => {

    const parser = repeat(optional(charIn("a")))

    test('repeat should parse "a" with no infinite loop', () => {
        const ctx = new Context("a")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('repeat should parse "ab" with no infinite loop', () => {
        const ctx = new Context("ab")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('repeat should parse "" with no infinite loop', () => {
        const ctx = new Context("")
        expect(parser.parse(ctx)).toBe(Result.Continue);
    })

    test('repeat should parse "b" with no infinite loop', () => {
        const ctx = new Context("b")
        expect(parser.parse(ctx)).toBe(Result.Continue);
    })

})

describe('combination repeat/sequence', () => {

    const parser = sequence(charIn("a"), repeat(charIn("b")), charIn("a"))

    test('repeat should Not parse "a"', () => {
        const ctx = new Context("a")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })
    
    test('repeat should Not parse "ab"', () => {
        const ctx = new Context("ab")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })
     
    test('repeat should not parse "aa"', () => {
        const ctx = new Context("aa")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

    test('repeat should parse "aba"', () => {
        const ctx = new Context("aba")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('repeat should parse "abbbbba"', () => {
        const ctx = new Context("abbbbba")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

})

describe('combination repeat/sequence/optioanl', () => {

    const parser = sequence(charIn("a"), repeat(optional(charIn("b"))), charIn("a"))

    test('repeat should Not parse "a"', () => {
        const ctx = new Context("a")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })
    
    test('repeat should Not parse "ab"', () => {
        const ctx = new Context("ab")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })
     
    test('repeat should parse "aa"', () => {
        const ctx = new Context("aa")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('repeat should parse "abbbbba"', () => {
        const ctx = new Context("abbbbba")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

})