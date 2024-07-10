import {
    Context,
    Result,
    charIn,
    optional,
    repeat,
    sequence,
    wordIs,
    wordNotIn
} from '../'

describe('basic wordNotIs', () => {

    test('wordNotIs should parse "/* here is a comment */"', () => {
        const ctx = new Context("/* here is a comment */")
        const parser = sequence(wordIs('/*'), repeat(optional(wordNotIn('*/'))), wordIs('*/'))

        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.pos).toBe(23)
    })
    
    test('wordNotIs should parse "/* here is a comment */"', () => {
        const ctx = new Context<string>("/* here is a comment */")
        const parser = sequence(
            wordIs('/*').productT(e => e), 
            repeat(optional(wordNotIn('*/'))).productT(e => e), 
            wordIs('*/').productT(e => e))

        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.tokens.map(e => e.symbol)).toStrictEqual(["/*", " here is a comment ", "*/"])
    })

    test('wordNotIs should parse "my string"', () => {
        const ctx = new Context<string>(`"my string"`)
        const parser = sequence(
            charIn('"').productT(e => e), 
            repeat(optional(wordNotIn('"'))).productT(e => e), 
            charIn('"').productT(e => e))

        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.tokens.map(e => e.symbol)).toStrictEqual(['"', "my string", '"'])
    })
        
    test('wordNotIs should parse "// comment"', () => {
        const ctx = new Context<string>("// comment")
        const parser = sequence(
            wordIs('//').productT(e => e), 
            repeat(optional(wordNotIn('\n'))).productT(e => e))

        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.tokens.map(e => e.symbol)).toStrictEqual(["//", " comment"])
    })

})