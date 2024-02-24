import AstBinary from "../../src/ast/AstBinary"
import AstTerm from "../../src/ast/AstTerm"
import StackVisitContext from "../../src/ast/StackVisiteContext"
import Visitor from "../../src/ast/Visitor"
import Context from "../../src/runtime/Context"
import choice from "../../src/choice"
import wordIs from "../../src/wordIs"
import { TokenType } from "../../src/runtime/TokenType"
import '../../src/productT'

const n3 = new AstTerm('number', '5')
const n2 = new AstTerm('number', '2')
const mult = new AstBinary('mult', n2, n3)
const n1 = new AstTerm('number', '4')
const add = new AstBinary('add', n1, mult)

class MyVisitor extends Visitor {

    static AUTO_TRAVERS = true

    static visitAdd(_: AstBinary, ctx: StackVisitContext<number>) {
        const right = ctx.pop()
        const left = ctx.pop()
        ctx.push(left + right)
    }

    static visitMult(_: AstBinary, ctx: StackVisitContext<number>) {
        const right = ctx.pop()
        const left = ctx.pop()
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

        expect(ctx.result).toBe(14)

    })
})

describe('Ast array', () => {

    test('should calculate twice', () => {
        const ctx = new StackVisitContext<number>()
        add.accept(MyVisitor, ctx)
        add.accept(MyVisitor, ctx)

        expect(ctx.result).toStrictEqual([14, 14])

    })
})

describe('Backtracking', () => {

    test('should backtrack locally', () => {
        const grammar = choice(wordIs('::='), wordIs(':='), wordIs('=')).productT()
        const ctx = new Context(':=')
        grammar.parse(ctx)

        expect(ctx.tokens).toEqual([
            { _symbol: ':=', _pos: 0, _type: '' }
        ])
    })

    test('should backtrack locally with for non product', () => {
        const grammar = choice(wordIs('::='), wordIs(':='), wordIs('='))
        const ctx = new Context(':=')
        grammar.parse(ctx)

        expect(ctx.tokens).toEqual([
            { _symbol: ':', _pos: 0, _type: TokenType.PUNCTUATION },
            { _symbol: '=', _pos: 1, _type: TokenType.PUNCTUATION }
        ])
    })

})
