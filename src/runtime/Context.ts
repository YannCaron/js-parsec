import SourceManager from './manager/SourceManager.ts'
import TokenManager from './manager/TokenManager.ts'
import SymbolManager from './manager/SymbolManager.ts'
import InstructionTapeManager from './manager/InstructionTapeManager.ts'
import ProductionManager from './manager/ProductionManager.ts'
import MemoizerHandler from './handler/MemoizerHandler.ts'

export default class Context<T> {

    private readonly _sourceManager: SourceManager
    private readonly _tokenManager: TokenManager
    private readonly _symbolManager: SymbolManager
    private readonly _instructionTapeManager: InstructionTapeManager<T>
    private readonly _productionManager: ProductionManager<T>
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

    get instructionTapeManager(): InstructionTapeManager<T> {
        return this._instructionTapeManager
    }

    get productionManager(): ProductionManager<T> {
        return this._productionManager
    }

    get memoizerHandler(): MemoizerHandler<T> {
        return this._memoizerHandler
    }

    constructor(src: string) {
        this._sourceManager = new SourceManager(src)
        this._tokenManager = new TokenManager()
        this._symbolManager = new SymbolManager()
        this._instructionTapeManager = new InstructionTapeManager()
        this._productionManager = new ProductionManager<T>(this._sourceManager)
        this._memoizerHandler = new MemoizerHandler<T>(this)
    }

    next() {
        const current = this.sourceManager.current

        if (current === null) return

        if (this.symbolManager.current) {
            this.symbolManager.append(current)
        } else {
            this.tokenManager.create(current, this.sourceManager.pos)
        }
        this.sourceManager.next()
    }

    /* istanbul ignore next */
    toString(): string {
        return `Context {
    - pos: ${this.sourceManager.pos}
    - src: ${this.sourceManager.enhancedSource}
    - tape: ${this.instructionTapeManager.queue}
    - tokens: ${this.tokenManager.tokens.map(e => '\n        ' + JSON.stringify(e))}
}`
    }

}
