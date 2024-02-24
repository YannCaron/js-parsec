import charIn from "../src/charIn";
import optional from "../src/optional";
import Context from "../src/runtime/Context";
import Result from "../src/runtime/Result";
import sequence from "../src/sequence";
import '../src/repeat'

describe('basic sequence/char', () => {

    const parser = sequence(charIn('a'), charIn('b'))

    test('sequence should parse "ab"', () => {
        const ctx = new Context("ab")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('sequence should not parse "a"', () => {
        const ctx = new Context("a")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })


    test('sequence should not parse "ac"', () => {
        const ctx = new Context("ac")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

    test('sequence should not parse "ba"', () => {
        const ctx = new Context("ba")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

})

describe('combination sequence/char', () => {

    const parser = sequence(charIn('ab'), charIn('ab'))

    test('sequence should parse "aa"', () => {
        const ctx = new Context("aa")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('sequence should parse "bb"', () => {
        const ctx = new Context("bb")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })


    test('sequence should parse "ab"', () => {
        const ctx = new Context("ab")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('sequence should parse "ba"', () => {
        const ctx = new Context("ba")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })


    test('sequence should not parse "b"', () => {
        const ctx = new Context("b")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

    test('sequence should not parse "bc"', () => {
        const ctx = new Context("bc")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

})

describe('sequence backup', () => {

    const parser = sequence(charIn('a'), charIn('b'))

    test('sequence that parse should be positioned at end', () => {
        const ctx = new Context("ab")
        parser.parse(ctx)
        expect(ctx.pos).toBe(2)
    })

    test('sequence that does not parse should be positioned at begining', () => {
        const ctx = new Context("ac")
        parser.parse(ctx)
        expect(ctx.pos).toBe(0)
    })

})

describe('combination sequence/optional', () => {

    test('sequence should parse "abc"', () => {
        const parser = sequence(charIn('a'), optional(charIn('b')), charIn('c'))
        const ctx = new Context("abc")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('sequence should parse "ac"', () => {
        const parser = sequence(charIn('a'), optional(charIn('b')), charIn('c'))
        const ctx = new Context("ac")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('sequence should not parse "aoc"', () => {
        const parser = sequence(charIn('a'), optional(charIn('b')), charIn('c'))
        const ctx = new Context("aoc")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

    test('sequence should parse "c"', () => {
        const parser = sequence(optional(charIn('a')), optional(charIn('b')), charIn('c'))
        const ctx = new Context("c")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('sequence should parse "aoc"', () => {
        const parser = sequence(optional(charIn('a')), optional(charIn('b')), charIn('c'))
        const ctx = new Context("aoc")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

    test('sequence should parse full optional', () => {
        const parser = sequence(optional(charIn('a')), optional(charIn('b')), optional(charIn('c')))
        const ctx = new Context("efg")
        expect(parser.parse(ctx)).toBe(Result.Continue);
    })

})

describe('inline factory of sequence', () => {

    test('"G => a b" should parse "ab"', () => {
        const parser = charIn("a").then(charIn('b'))
        const ctx = new Context("ab")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('"G => (a b) c" should merge', () => {
        const parser = charIn("a").then(charIn('b').then(charIn('c')))
        expect(`${parser}`).toEqual("([a] [b] [c])")
    })

    test('"G => a (b c)" should merge', () => {
        const parser = charIn("a").then(charIn('b')).then(charIn('c'))
        expect(`${parser}`).toEqual("([a] [b] [c])")
    })

    test('"G => ((a b) c d)" should merge', () => {
        const parser = charIn("a").then(charIn('b').then(charIn('c'))).then(charIn('d'))
        expect(`${parser}`).toEqual("([a] [b] [c] [d])")
    })
    
    test('"G => ((a b) c d)" should merge', () => {
        const parser = charIn("a").then(charIn('b')).optional().then(charIn('c'))
        expect(`${parser}`).toEqual("(([a] [b])? [c])")
    })
        
    test('"G => ((a b) c d)" should merge', () => {
        const parser = charIn("a").then(charIn('b')).optional().then(charIn('c')).repeat()
        expect(`${parser}`).toEqual("(([a] [b])? [c])+")
    })

})