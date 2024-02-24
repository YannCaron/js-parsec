import Context from "../src/runtime/Context";
import charIn from "../src/charIn";
import choice from "../src/choice";
import optional from "../src/optional";
import sequence from "../src/sequence";
import Result from "../src/runtime/Result";
import '../src/repeat'

describe('basic choice/char', () => {

    const parser = choice(charIn('a'), charIn('b'))

    test('choice should parse "a"', () => {
        const ctx = new Context("b")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('choice should parse "b"', () => {
        const ctx = new Context("b")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('choice should not parse "c"', () => {
        const ctx = new Context("c")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

})

describe('choice backup', () => {

    const parser = sequence(choice(charIn('c'), charIn('a')), choice(charIn('d'), charIn('b')))

    test('choice that parse should be positioned at end', () => {
        const ctx = new Context("ab")
        parser.parse(ctx)
        expect(ctx.pos).toBe(2)
    })
    
    test('choice that parse should be positioned at end', () => {
        const ctx = new Context("ad")
        parser.parse(ctx)
        expect(ctx.pos).toBe(2)
    })

    test('choice that does not parse should be positioned at begining', () => {
        const ctx = new Context("ac")
        parser.parse(ctx)
        expect(ctx.pos).toBe(0)
    })

    test('choice that parse should be positioned at end', () => {
        const ctx = new Context("cd")
        parser.parse(ctx)
        expect(ctx.pos).toBe(2)
    })

    test('choice that parse should be positioned at end', () => {
        const ctx = new Context("cb")
        parser.parse(ctx)
        expect(ctx.pos).toBe(2)
    })

})

describe('combination choice/optional', () => {

    const parser = choice(charIn('a'), optional(charIn('b')), charIn('c'))

    test('choice should parse "a"', () => {
        const ctx = new Context("a")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })
    
    test('choice should parse "b"', () => {
        const ctx = new Context("b")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('choice should parse "c"', () => {
        const ctx = new Context("c")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })
    
    test('choice should not parse "d"', () => {
        const ctx = new Context("d")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
    })

})

describe('inline factory of choice', () => {

    test('"G => a | b" should parse "ab"', () => {
        const parser = charIn("a").or(charIn('b'))
        const ctx = new Context("ab")
        expect(parser.parse(ctx)).toBe(Result.Parsed);
    })

    test('"G => (a | b) | c" should merge', () => {
        const parser = charIn("a").or(charIn('b').or(charIn('c')))
        expect(`${parser}`).toEqual("([a] | [b] | [c])")
    })

    test('"G => a | (b | c)" should merge', () => {
        const parser = charIn("a").or(charIn('b')).or(charIn('c'))
        expect(`${parser}`).toEqual("([a] | [b] | [c])")
    })

    test('"G => ((a | b) | c | d)" should merge', () => {
        const parser = charIn("a").or(charIn('b').or(charIn('c'))).or(charIn('d'))
        expect(`${parser}`).toEqual("([a] | [b] | [c] | [d])")
    })
    
    test('"G => ((a | b) | c | d)" should merge', () => {
        const parser = charIn("a").or(charIn('b')).optional().or(charIn('c'))
        expect(`${parser}`).toEqual("(([a] | [b])? | [c])")
    })
        
    test('"G => ((a | b) | c | d)" should merge', () => {
        const parser = charIn("a").or(charIn('b')).optional().or(charIn('c')).repeat()
        expect(`${parser}`).toEqual("(([a] | [b])? | [c])+")
    })

})