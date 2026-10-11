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
        assert.strictEqual(ctx.pos, 23)
    })
    
    test('wordNotIs should parse "/* here is a comment */"', () => {
        const ctx = new Context<string>("/* here is a comment */")
        const parser = sequence(
            wordIs('/*').productT(e => e), 
            repeat(optional(wordNotIn('*/'))).productT(e => e), 
            wordIs('*/').productT(e => e))

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.tokens.map(e => e.symbol), ["/*", " here is a comment ", "*/"])
    })

    test('wordNotIs should parse "my string"', () => {
        const ctx = new Context<string>(`"my string"`)
        const parser = sequence(
            charIn('"').productT(e => e), 
            repeat(optional(wordNotIn('"'))).productT(e => e), 
            charIn('"').productT(e => e))

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.tokens.map(e => e.symbol), ['"', "my string", '"'])
    })
        
    test('wordNotIs should parse "// comment"', () => {
        const ctx = new Context<string>("// comment")
        const parser = sequence(
            wordIs('//').productT(e => e), 
            repeat(optional(wordNotIn('\n'))).productT(e => e))

        assert.strictEqual(parser.parse(ctx), Result.Parsed)
        assert.deepStrictEqual(ctx.tokens.map(e => e.symbol), ["//", " comment"])
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
        assert.strictEqual(ctx.pos, 5)
    })

})