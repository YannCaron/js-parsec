import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import AstBinary from "../../src/ast/AstBinary.ts"
import AstTerm from "../../src/ast/AstTerm.ts"
import StackVisitContext from "../../src/ast/StackVisitContext.ts"
import Visitor from "../../src/ast/Visitor.ts"
import Context from "../../src/runtime/Context.ts"
import Token from "../../src/runtime/Token.ts"
import choice from "../../src/choice.ts"
import wordIs from "../../src/wordIs.ts"
import { TokenType } from "../../src/runtime/TokenType.ts"
import '../../src/productT.ts'

const n3 = new AstTerm('number', '5')
const n2 = new AstTerm('number', '2')
const mult = new AstBinary('mult', n2, n3)
const n1 = new AstTerm('number', '4')
const add = new AstBinary('add', n1, mult)

class MyVisitor extends Visitor {

    static AUTO_TRAVERS = true

    static visitAdd(_: AstBinary, ctx: StackVisitContext<number>) {
        const right = ctx.pop()!
        const left = ctx.pop()!
        ctx.push(left + right)
    }

    static visitMult(_: AstBinary, ctx: StackVisitContext<number>) {
        const right = ctx.pop()!
        const left = ctx.pop()!
        ctx.push(left * right)
    }

    static visitNumber(ast: AstTerm, ctx: StackVisitContext<number>) {
        ctx.push(Number.parseInt(ast.value))
    }

}

describe('Ast visitor traversal', () => {

    test('should calculate', () => {
        const ctx = new StackVisitContext<number>()
        add.accept(MyVisitor, ctx)

        assert.strictEqual(ctx.result, 14)

    })
})

describe('Ast array', () => {

    test('should calculate twice', () => {
        const ctx = new StackVisitContext<number>()
        add.accept(MyVisitor, ctx)
        add.accept(MyVisitor, ctx)

        assert.deepStrictEqual(ctx.result, [14, 14])

    })
})

describe('Backtracking', () => {

    test('should backtrack locally', () => {
        const grammar = choice(wordIs('::='), wordIs(':='), wordIs('=')).productT()
        const ctx = new Context(':=')
        grammar.parse(ctx)

        assert.deepStrictEqual(ctx.tokens, [
            new Token(':=', 0, '')
        ])
    })

    test('should backtrack locally with for non product', () => {
        const grammar = choice(wordIs('::='), wordIs(':='), wordIs('='))
        const ctx = new Context(':=')
        grammar.parse(ctx)

        assert.deepStrictEqual(ctx.tokens, [
            new Token(':', 0, TokenType.PUNCTUATION),
            new Token('=', 1, TokenType.PUNCTUATION)
        ])
    })

})
