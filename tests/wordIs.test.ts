import {
    Context,
    Result,
    charIn,
    sequence,
    wordIs
} from '..'

describe('basic wordIs', () => {

    const parser = sequence(wordIs("hi"), charIn(' '), wordIs('world'))

    test('wordis should parse "hi world"', () => {
        const ctx = new Context("hi world")
        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.pos).toBe(8)
    })

    test('wordis should not parse "hi wurld"', () => {
        const ctx = new Context("hi wurld")
        expect(parser.parse(ctx)).toBe(Result.NotParsed);
        expect(ctx.pos).toBe(0)
        expect(ctx.tokens).toStrictEqual([])
        expect(ctx.stack).toStrictEqual([])
    })
    
    test('wordis to string', () => {
        expect(parser.toString()).toBe(`("hi" [ ] "world")`)
    })

})