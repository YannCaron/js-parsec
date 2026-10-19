import type { Stack, StringBuilder } from '@cyann/js-commons'
import Token from './Token.ts'
import { TokenType } from './TokenType.ts'
import { Result } from './Result.ts';
import type { Parsem } from '../Parsem.ts';
import TransactionManager, { Transaction } from './TransactionManager.ts';
import SourceManager from './SourceManager.ts'
import TokenManager from './TokenManager.ts'
import BuilderManager from './BuilderManager.ts'
import ProductionManager from './ProductionManager.ts'

interface MemoEntry<T> {
    result: Result;
    pos: number;
    transactions: Transaction<T>[]
}

export default class Context<T> {

    readonly _sourceManager: SourceManager
    readonly _tokenManager: TokenManager
    readonly _builderManager: BuilderManager
    readonly _productionManager: ProductionManager<T>
    readonly _transactionManager : TransactionManager<T>
    readonly _memoizer: WeakMap<Parsem<T>, Map<number, MemoEntry<T>>>

    get pos(): number {
        return this.sourceManager.pos
    }

    set pos(value: number) {
        this.sourceManager.pos = value
    }

    get current(): string | null {
        return this.sourceManager.current
    }

    /* istanbul ignore next */
    get currentBuilder(): StringBuilder {
        return this.builderManager.current
    }

    get tokens(): Array<Token> {
        return this.tokenManager.tokens
    }

    get stack(): Array<T> {
        return this.productionManager.stack
    }

    get builderPos(): number {
        return this.builderManager.builderPos
    }

    set builderPos(value: number) {
        this.builderManager.builderPos = value
    }

    get buildersPos(): number {
        return this.builderManager.pos
    }

    set buildersPos(value: number) {
        this.builderManager.pos = value
    }

    get tokensPos(): number {
        return this.tokenManager.pos
    }

    set tokensPos(value: number) {
        this.tokenManager.pos = value
    }

    get stackPos(): number {
        return this.productionManager.pos
    }

    set stackPos(value: number) {
        this.productionManager.pos = value
    }

    get sourceManager(): SourceManager {
        return this._sourceManager
    }

    get tokenManager(): TokenManager {
        return this._tokenManager
    }

    get builderManager(): BuilderManager {
        return this._builderManager
    }

    get productionManager(): ProductionManager<T> {
        return this._productionManager
    }

    // Keep the in-progress transactions connected to the managers' storage.
    get _tokens(): Array<Token> {
        return this.tokenManager._tokens
    }

    get _stack(): Stack<T> {
        return this.productionManager._stack
    }

    get transactionManager(): TransactionManager<T> {
        return this._transactionManager
    }

    get enhancedSource(): string {
        return this.sourceManager.enhancedSource
    }

    get result(): Array<T> | T {
        this.sourceManager.assertComplete()
        return this.productionManager.result
    }

    get uniqueResult(): T {
        if (this.productionManager.pos !== 1)
            this.sourceManager.assertComplete()

        return this.productionManager.uniqueResult
    }

    getMemo(parsem: Parsem<T>, pos: number): MemoEntry<T> | undefined {
        return this._memoizer.get(parsem)?.get(pos)
    }

    setMemo(parsem: Parsem<T>, pos: number, entry: MemoEntry<T>): void {
        let position = this._memoizer.get(parsem)

        if (!position) {
            position = new Map<number, MemoEntry<T>>
            this._memoizer.set(parsem, position)
        }

        position.set(pos, entry)
    }

    constructor(src: string) {
        this._sourceManager = new SourceManager(src)
        this._tokenManager = new TokenManager()
        this._builderManager = new BuilderManager()
        this._productionManager = new ProductionManager<T>()
        this._transactionManager = new TransactionManager();
        this._memoizer = new WeakMap<Parsem<T>, Map<number, MemoEntry<T>>>();
    }

    next() {
        if (this.current === null) return

        if (this.currentBuilder) {
            this.builderManager.append(this.current)
        } else {
            this.createToken(this.current, this.pos)
        }
        this.sourceManager.next()
    }

    createToken(symbol: string, pos: number, type: TokenType = TokenType.DEFAULT) {
        this.tokenManager.create(symbol, pos, type)
    }

    appendToken(token: Token) {
        this.tokenManager.append(token)
    }

    /* istanbul ignore next */
    toString(): string {
        return `Context {
    - pos: ${this.pos}
    - src: ${this.enhancedSource}
    - stack: ${this.stack}
    - tokens: ${this.tokens.map(e => '\n        ' + JSON.stringify(e))}
}`
    }

}
