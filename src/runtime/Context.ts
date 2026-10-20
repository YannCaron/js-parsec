import SourceManager from './SourceManager.ts'
import TokenManager from './TokenManager.ts'
import BuilderManager from './BuilderManager.ts'
import InstructionTapeManager from './InstructionTapeManager.ts'
import ProductionManager from './ProductionManager.ts'

export default class Context<T> {

    private readonly _sourceManager: SourceManager
    private readonly _tokenManager: TokenManager
    private readonly _builderManager: BuilderManager
    private readonly _instructionTapeManager: InstructionTapeManager<T>
    
    // TODO: remove
    private readonly _productionManager: ProductionManager<T>

    get sourceManager(): SourceManager {
        return this._sourceManager
    }

    get tokenManager(): TokenManager {
        return this._tokenManager
    }

    get builderManager(): BuilderManager {
        return this._builderManager
    }

    get instructionTapeManager(): InstructionTapeManager<T> {
        return this._instructionTapeManager
    }

    get productionManager(): ProductionManager<T> {
        return this._productionManager
    }

    constructor(src: string) {
        this._sourceManager = new SourceManager(src)
        this._tokenManager = new TokenManager()
        this._builderManager = new BuilderManager()
        this._instructionTapeManager = new InstructionTapeManager()
        this._productionManager = new ProductionManager<T>(this._sourceManager)
    }

    next() {
        const current = this.sourceManager.current

        if (current === null) return

        if (this.builderManager.current) {
            this.builderManager.append(current)
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
