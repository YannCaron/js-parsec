import SourceManager from './manager/SourceManager.ts'
import TokenManager from './manager/TokenManager.ts'
import SymbolManager from './manager/SymbolManager.ts'
import SymbolEffectJournal from './manager/SymbolEffectJournal.ts'
import ProductionEffectJournal from './manager/ProductionEffectJournal.ts'
import ProductionManager from './manager/ProductionManager.ts'
import MemoizerHandler from './handler/MemoizerHandler.ts'
import BacktrackingHandler from './handler/BacktrackingHandler.ts'

export default class Context<T> {

    private readonly _sourceManager: SourceManager
    private readonly _tokenManager: TokenManager
    private readonly _symbolManager: SymbolManager
    private readonly _symbolEffectJournal: SymbolEffectJournal<T>
    private readonly _productionEffectJournal: ProductionEffectJournal<T>
    private readonly _productionManager: ProductionManager<T>
    private readonly _backtrackingHandler: BacktrackingHandler<T>
    private readonly _memoizerHandler: MemoizerHandler<T>

    get sourceManager(): SourceManager {
        return this._sourceManager
    }

    get tokenManager(): TokenManager {
        return this._tokenManager
    }

    get symbolManager(): SymbolManager {
        return this._symbolManager
    }

    get symbolEffectJournal(): SymbolEffectJournal<T> {
        return this._symbolEffectJournal
    }

    get productionEffectJournal(): ProductionEffectJournal<T> {
        return this._productionEffectJournal
    }

    get productionManager(): ProductionManager<T> {
        return this._productionManager
    }

    get memoizerHandler(): MemoizerHandler<T> {
        return this._memoizerHandler
    }

    get backtrackingHandler(): BacktrackingHandler<T> {
        return this._backtrackingHandler
    }

    constructor(src: string) {
        this._sourceManager = new SourceManager(src)
        this._tokenManager = new TokenManager()
        this._symbolManager = new SymbolManager()
        this._symbolEffectJournal = new SymbolEffectJournal<T>(this)
        this._productionEffectJournal = new ProductionEffectJournal()
        this._productionManager = new ProductionManager<T>(this._sourceManager)
        this._backtrackingHandler = new BacktrackingHandler<T>(this)
        this._memoizerHandler = new MemoizerHandler<T>(this)
    }

    next() {
        const current = this.sourceManager.current

        if (current === null) return

        const pos = this.sourceManager.pos

        if (this.symbolManager.current) {
            this.symbolManager.append(current)
        } else {
            this.tokenManager.create(current, this.sourceManager.pos)
        }
        this.sourceManager.next()
        this.symbolEffectJournal.recordRead(pos, this.sourceManager.pos)
    }

    /* istanbul ignore next */
    toString(): string {
        return `Context {
    - pos: ${this.sourceManager.pos}
    - src: ${this.sourceManager.enhancedSource}
    - production effects: ${this.productionEffectJournal.queue}
    - tokens: ${this.tokenManager.tokens.map(e => '\n        ' + JSON.stringify(e))}
}`
    }

}
