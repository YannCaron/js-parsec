import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import Context from "../src/runtime/Context.ts";
import charIn from "../src/charIn.ts";
import optional from "../src/optional.ts";
import repeat from "../src/repeat.ts";
import sequence from "../src/sequence.ts";
import { productT } from "../src/productT.ts";
import { Result } from "../src/runtime/Result.ts";
import Token from "../src/runtime/Token.ts";
import { TokenType } from "../src/runtime/TokenType.ts";
import '../src/choice.ts'

describe('basic productT', () => {

    const parser = productT(charIn("ab"), s => s)

    test('product should parse "a"', () => {
        const ctx = new Context<string>("a")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.stack, ['a'])
    })

    test('product should not parse "c"', () => {
        const ctx = new Context<string>("c")
        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
        assert.deepStrictEqual(ctx.stack, [])
    })

})

describe('chain productT with optional', () => {

    const parser = sequence(charIn("a").productT(s => s), optional(repeat(charIn(" \t\n\r"))), charIn("b").productT(s => s))

    test('product should parse "ab"', () => {
        const ctx = new Context<string>("ab")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.stack, ['a', 'b'])
    })

    test('product should parse "a b"', () => {
        const ctx = new Context<string>("a b")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.stack, ['a', 'b'])
    })

    test('product should parse "a  b"', () => {
        const ctx = new Context<string>("a  b")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.stack, ['a', 'b'])
    })

})

describe('token productT', () => {

    const _ = repeat(optional(charIn(' \t\r\n')))
    const n = repeat(charIn("0123456789")).productT(s => s).type(TokenType.NUMBER)
    const G = sequence(_, n, _, n, _)

    test('product should parse "10 20 "', () => {
        const ctx = new Context("10 20 ")
        assert.strictEqual(G.parse(ctx), Result.Parsed)

        assert.deepStrictEqual(ctx.tokens, [
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
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.stack, ['ab'])
    })

    test('product should parse "a  b"', () => {
        const ctx = new Context("a  b")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.stack, ['  ', 'ab'])
    })

})

describe('inline factory of productT', () => {

    test('"G => a | b" should parse "a"', () => {
        const parser = charIn("a").or(charIn('b')).productT(s => s)
        const ctx = new Context<string>("a")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.stack, ['a'])
    })

})

describe('production of productT', () => {

    const num = charIn('0123456789')
    const parser = sequence(productT(num, v => Number(v)), charIn('+'), productT(num, v => Number(v)))

    test('product should parse "2+2"', () => {
        const ctx = new Context("2+2")
        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.stack, [2, 2])
    })

})