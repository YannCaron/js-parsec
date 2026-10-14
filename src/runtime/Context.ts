import { Stack, StringBuilder } from '@cyann/js-commons'
import Token from './Token.ts'
import { TokenType } from './TokenType.ts'
import { Result } from './Result.ts';
import type { Parsem } from '../Parsem.ts';

interface MemoEntry {
    result: Result;
    pos: number;
}

export default class Context<T> {

    static readonly DEFAULT_TOKEN_TYPE = TokenType.PUNCTUATION

    readonly _src: string
    _pos: number
    readonly _builders: Stack<StringBuilder>

    readonly _tokens: Array<Token>;
    readonly _stack: Stack<T>;
    readonly _memoizer: WeakMap<Parsem<T>, Map<number, MemoEntry>>

    get pos(): number {
        return this._pos
    }

    set pos(value: number) {
        this._pos = value
    }

    get current(): string | null {
        if (this._pos >= this._src.length) return null
        return this._src.charAt(this._pos)
    }

    /* istanbul ignore next */
    get currentBuilder(): StringBuilder {
        return this._builders?.last
    }

    get tokens(): Array<Token> {
        return [...this._tokens]
    }

    get stack(): Array<T> {
        return [...this._stack]
    }

    get builderPos(): number {
        return this.currentBuilder?.length
    }

    set builderPos(value: number) {
        this.currentBuilder?.splice(value)
    }

    get buildersPos(): number {
        return this._builders.length
    }

    set buildersPos(value: number) {
        this._builders.splice(value)
    }

    get tokensPos(): number {
        return this._tokens.length
    }

    set tokensPos(value: number) {
        this._tokens.splice(value)
    }

    get stackPos(): number {
        return this._stack.length
    }

    set stackPos(value: number) {
        this._stack.splice(value)
    }

    get enhancedSource(): string {
        return `${this._src.substring(0, this._pos)}[${this._src.substring(this._pos, this._pos + 1)}]${this._src.substring(this._pos + 1)}`
    }

    get result(): Array<T> | T {
        if (this._pos != this._src.length)
            throw new Error(`Source not completelly parsed. Parsing stopped at position: ${this._pos} in:\n${this.enhancedSource}`)

        if (this._stack.length == 1)
            return this._stack.last

        return this.stack
    }

    get uniqueResult(): T {
        if (this._stack.length === 1) {
            return this._stack.last
        }

        const res = this.result
        return Array.isArray(res) ? res.first : res
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
        this._src = src
        this._pos = 0
        this._builders = new Stack<StringBuilder>()
        this._tokens = new Array<Token>()
        this._stack = new Stack<T>()
        this._memoizer = new WeakMap<Parsem<T>, Map<number, MemoEntry>>();
    }

    next() {
        if (this.current === null) return

        if (this.currentBuilder) {
            this.currentBuilder.append(this.current)
        } else {
            this.createToken(this.current, this.pos)
        }
        this._pos++
    }

    createToken(symbol: string, pos: number, type: TokenType = Context.DEFAULT_TOKEN_TYPE) {
        this._tokens.push(new Token(symbol, pos, type))
    }

    /* istanbul ignore next */
    toString(): string {
        return `Context {
    - pos: ${this._pos}
    - src: ${this.enhancedSource}
    - stack: ${this._stack}
    - tokens: ${this._tokens.map(e => '\n        ' + JSON.stringify(e))}
}`
    }

}
