import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
    Context,
    Result,
    charIn,
    optional,
    repeat,
    sequence,
    choice,
    wordIs,
    wordNotIn
} from '../index.ts'

describe('basic wordNotIs', () => {

    test('wordNotIs should parse "/* here is a comment */"', () => {
        const ctx = new Context("/* here is a comment */")
        const parser = sequence(wordIs('/*'), repeat(optional(wordNotIn('*/'))), wordIs('*/'))

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 23)
    })
    
    test('wordNotIs should parse "/* here is a comment */"', () => {
        const ctx = new Context<string>("/* here is a comment */")
        const parser = sequence(
            wordIs('/*').productT(e => e), 
            repeat(optional(wordNotIn('*/'))).productT(e => e), 
            wordIs('*/').productT(e => e))

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.tokenManager.tokens.map(e => e.symbol), ["/*", " here is a comment ", "*/"])
    })

    test('wordNotIs should parse "my string"', () => {
        const ctx = new Context<string>(`"my string"`)
        const parser = sequence(
            charIn('"').productT(e => e), 
            repeat(optional(wordNotIn('"'))).productT(e => e), 
            charIn('"').productT(e => e))

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.tokenManager.tokens.map(e => e.symbol), ['"', "my string", '"'])
    })
        
    test('wordNotIs should parse "// comment"', () => {
        const ctx = new Context<string>("// comment")
        const parser = sequence(
            wordIs('//').productT(e => e), 
            repeat(optional(wordNotIn('\n'))).productT(e => e))

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.tokenManager.tokens.map(e => e.symbol), ["//", " comment"])
    })

})

describe('wordNotIs state', () => {

    test('wordNotIn single char match', () => {
        const ctx = new Context("xbx")
        const parser = sequence(wordIs('x'), wordNotIn('x'), wordIs('x'))

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
    })

    test('wordNotIn choice fallback', () => {
        const ctx = new Context("xxaxx")
        const parser = sequence(wordIs('x'), choice(repeat(wordNotIn('x')), wordIs('xax')), wordIs('x'))

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 5)
    })

})

describe('wordNotIn edge cases and invariants', () => {

    test('wordNotIn should not parse on empty input', () => {
        const ctx = new Context("")
        const parser = wordNotIn('x')

        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

    test('repeat(wordNotIn) should parse until end of stream without infinite loop', () => {
        const ctx = new Context("abc")
        const parser = repeat(wordNotIn('x'))

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.strictEqual(ctx.sourceManager.pos, 3)
    })

    test('sequence(wordIs, wordNotIn) should not parse when stream ends after first token', () => {
        const ctx = new Context("a")
        const parser = sequence(wordIs('a'), wordNotIn('x'))

        assert.strictEqual(parser.parse(ctx), Result.NotParsed)
    })

})

