import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import Ast from "../../src/ast/Ast.ts"
import AstBinary from "../../src/ast/AstBinary.ts"
import AstNode from "../../src/ast/AstNode.ts"
import AstTerm from "../../src/ast/AstTerm.ts"
import AstTernary from "../../src/ast/AstTernary.ts"
import AstUnary from "../../src/ast/AstUnary.ts"
import StackVisitContext from "../../src/ast/StackVisitContext.ts"
import Visitor from "../../src/ast/Visitor.ts"

const t34 = new AstTerm('t', '34')
const n5 = new AstUnary('n', t34)
const t33 = new AstTerm('t', '33')
const t32 = new AstTerm('t', '32')
const n4 = new AstBinary('n', t32, t33)
const t31 = new AstTerm('t', '31')
const n3 = new AstTernary('n', t31, n4, n5)
const t21 = new AstTerm('t', '21')
const t22 = new AstTerm('t', '22')
const n2 = new AstNode('n', t21, t22)
const t1 = new AstTerm('t', '1')
const ast = new AstNode('root', t1, n2, n3)

class MyVisitContext extends StackVisitContext<number> {

    private _visited:Set<string>

    constructor() {
        super()
        this._visited = new Set<string>()
    }

    setVisited(name: string) {
        this._visited.add(name)
    }
    
    has(visited: string):boolean {
        return this._visited.has(visited)
    }

}

class MyVisitor extends Visitor {
    
    static AUTO_TRAVERS = true

    static visitRoot(_:Ast, ctx: MyVisitContext) {
        ctx.setVisited('root')
    }

    static visitN(_:Ast, ctx: MyVisitContext) {
        ctx.setVisited('node')
    }

    static visitT(_:Ast, ctx: MyVisitContext) {
        ctx.setVisited('term')
    }

}

describe('Ast visitor dispatching', () => {

    test('should call visitor methods', () => {
        const ctx = new MyVisitContext()
        ast.accept(MyVisitor, ctx)

        assert.strictEqual(ctx.has('root'), true)
        assert.strictEqual(ctx.has('node'), true)
        assert.strictEqual(ctx.has('term'), true)

    })
})

describe('Ast visitor not dispatching', () => {

    test('should generate error', () => {
        const ctx = new MyVisitContext()

        assert.throws(() => { ast.accept({} as any, ctx) }, Error)

    })
})

describe('Ast visitor toString', () => {

    test('visitor toString', () => {
        
        assert.strictEqual(ast.toString(), `root(t('1'), n(t('21'), t('22')), n(t('31'), n(t('32'), t('33')), n(t('34'))))`)

    })
})

describe('Test accessor', () => {

    test('should generate error', () => {

        // node
        assert.strictEqual(ast.children.length, 3)

        // unary
        assert.strictEqual(n5.operand1.toString(), "t('34')")

        // binary
        assert.strictEqual(n4.operand1.toString(), "t('32')")
        assert.strictEqual(n4.operand2.toString(), "t('33')")

        // ternary
        assert.strictEqual(n3.operand1.toString(), "t('31')")
        assert.strictEqual(n3.operand2.toString(), "n(t('32'), t('33'))")
        assert.strictEqual(n3.operand3.toString(), "n(t('34'))")

    })
})