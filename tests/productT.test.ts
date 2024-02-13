import Context from "../src/runtime/Context";
import charIn from "../src/charIn";
import optional from "../src/optional";
import repeat from "../src/repeat";
import sequence from "../src/sequence";
import { productT } from "../src/productT";
import Result from "../src/runtime/Result";
import Token from "../src/runtime/Token";
import { TokenType } from "../src/runtime/TokenType";

describe('basic productT', () => {

    const parser = productT(charIn("ab"), s => s)

    test('product should parse "a"', () => {
        const ctx = new Context<string>("a")
        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.stack).toStrictEqual(['a'])
    })

    test('product should not parse "c"', () => {
        const ctx = new Context<string>("c")
        expect(parser.parse(ctx)).toBe(Result.NotParsed)
        expect(ctx.stack).toStrictEqual([])
    })

})

describe('chain productT with optional', () => {

    const parser = sequence(charIn("a").productT(s => s), optional(repeat(charIn(" \t\n\r"))), charIn("b").productT(s => s))

    test('product should parse "ab"', () => {
        const ctx = new Context<string>("ab")
        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.stack).toStrictEqual(['a', 'b'])
    })

    test('product should parse "a b"', () => {
        const ctx = new Context<string>("a b")
        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.stack).toStrictEqual(['a', 'b'])
    })

    test('product should parse "a  b"', () => {
        const ctx = new Context<string>("a  b")
        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.stack).toStrictEqual(['a', 'b'])
    })

})

describe('token productT', () => {

    const _ = repeat(optional(charIn(' \t\r\n')))
    const n = repeat(charIn("0123456789")).productT(s => s).type(TokenType.NUMBER)
    const G = sequence(_, n, _, n, _)

    test('product should parse "10 20 "', () => {
        const ctx = new Context("10 20 ")
        expect(G.parse(ctx)).toBe(Result.Parsed)

        expect(ctx.tokens).toStrictEqual([
            new Token('10', 0, TokenType.NUMBER),
            new Token(' ', 2, TokenType.PUNCTUATION),
            new Token('20', 3, TokenType.NUMBER),
            new Token(' ', 5, TokenType.PUNCTUATION)])
    })

})


describe('encapsulated productT', () => {

    const parser = sequence(productT(sequence(charIn("a"), productT(optional(repeat(charIn(' '))), s => s), charIn('b')), s => s))

    test('product should parse "ab"', () => {
        const ctx = new Context("ab")
        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.stack).toStrictEqual(['ab'])
    })

    test('product should parse "a  b"', () => {
        const ctx = new Context("a  b")
        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.stack).toStrictEqual(['  ', 'ab'])
    })

})

describe('inline factory of productT', () => {

    test('"G => a | b" should parse "a"', () => {
        const parser = charIn("a").or(charIn('b')).productT(s => s)
        const ctx = new Context<string>("a")
        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.stack).toStrictEqual(['a'])
    })

})

describe('production of productT', () => {

    const num = charIn('0123456789')
    const parser = sequence(productT(num, v => Number(v)), charIn('+'), productT(num, v => Number(v)))

    test('product should parse "2+2"', () => {
        const ctx = new Context("2+2")
        expect(parser.parse(ctx)).toBe(Result.Parsed)
        expect(ctx.stack).toStrictEqual([2, 2])
    })

})