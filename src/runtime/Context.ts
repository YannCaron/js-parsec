import { Result } from './Result.ts';
import type { Parsem } from '../Parsem.ts';
import SourceManager from './SourceManager.ts'
import TokenManager from './TokenManager.ts'
import BuilderManager from './BuilderManager.ts'
import ProductionManager from './ProductionManager.ts'

interface MemoEntry {
    result: Result;
    pos: number;
}

export default class Context<T> {

    private readonly _sourceManager: SourceManager
    private readonly _tokenManager: TokenManager
    private readonly _builderManager: BuilderManager
    private readonly _productionManager: ProductionManager<T>
    private readonly _memoizer = new Map<Parsem<T>, Map<number, MemoEntry>>()

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

    getMemo(parsem: Parsem<T>, pos: number): MemoEntry | undefined {
        return this._memoizer.get(parsem)?.get(pos)
    }

    setMemo(parsem: Parsem<T>, pos: number, result: Result, tokenPos: number): void {
        let position = this._memoizer.get(parsem)

        if (!position) {
            position = new Map<number, MemoEntry>
            this._memoizer.set(parsem, position)
        }

        position.set(pos, {
            result,
            pos: tokenPos
        })
    }

    constructor(src: string) {
        this._sourceManager = new SourceManager(src)
        this._tokenManager = new TokenManager()
        this._builderManager = new BuilderManager()
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
    - stack: ${this.productionManager.stack}
    - tokens: ${this.tokenManager.tokens.map(e => '\n        ' + JSON.stringify(e))}
}`
    }

}
