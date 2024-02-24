import { Functions, Stack, StringBuilder } from '@cyann/js-commons'
import { Result } from './Result'
import Token from './Token'
import { TokenType } from './TokenType'

export default class Context<T> {

    private static readonly DEFAULT_TOKEN_TYPE = TokenType.PUNCTUATION

    private readonly _src: string
    private _pos: number
    private readonly _builders: Stack<StringBuilder>

    private readonly _tokens: Array<Token>;
    private readonly _stack: Stack<T>;

    get pos(): number {
        return this._pos
    }

    private set pos(value: number) {
        this._pos = value
    }

    get current(): string | null {
        if (this._pos >= this._src.length) return null
        return this._src.charAt(this._pos)
    }

    /* istanbul ignore next */
    private get currentBuilder(): StringBuilder {
        return this._builders?.last
    }

    get tokens(): Array<Token> {
        return [...this._tokens]
    }

    get stack(): Array<T> {
        return [...this._stack]
    }

    private get builderPos(): number {
        return this.currentBuilder?.length
    }

    private set builderPos(value: number) {
        this.currentBuilder?.splice(value)
    }

    private get buildersPos(): number {
        return this._builders.length
    }

    private set buildersPos(value: number) {
        this._builders.splice(value)
    }

    private get tokensPos(): number {
        return this._tokens.length
    }

    private set tokensPos(value: number) {
        this._tokens.splice(value)
    }

    private get stackPos(): number {
        return this._stack.length
    }

    private set stackPos(value: number) {
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
        return Array.isArray(this.result) ? this.result.first : this.result
    }

    constructor(src: string) {
        this._src = src
        this._pos = 0
        this._builders = new Stack<StringBuilder>()
        this._tokens = new Array<Token>()
        this._stack = new Stack<T>()
    }

    next() {
        if (this.current === undefined) return

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

    static handleBackup<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result): Result {
        const backup = { pos: ctx._pos, buildersPos: ctx.buildersPos, builderPos: ctx.builderPos, tokensPos: ctx.tokensPos, stackPos: ctx.stackPos }

        // run encapsulated lambda
        const res = lambda(ctx)

        if (res === Result.NotParsed) {
            ctx.pos = backup.pos
            ctx.buildersPos = backup.buildersPos
            ctx.builderPos = backup.builderPos
            ctx.tokensPos = backup.tokensPos
            ctx.stackPos = backup.stackPos
        }

        return res
    }

    static handleTProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (v: string) => T, type?: TokenType): Result {
        const pos = ctx.pos
        ctx._builders.push(new StringBuilder())

        // run encapsulated lambda
        const res = lambda(ctx)

        const builder = ctx._builders.pop()

        if (res !== Result.Parsed)
            return res

        if (!builder) return res

        const symbol = builder.toString()
        ctx.createToken(symbol, pos, type)

        const product = producer ? producer(symbol) : undefined
        if (product)
            ctx._stack.push(product)

        return Result.Parsed
    }

    static calculateStackDepth<T>(ctx: Context<T>, startPos: number, lambda: (...v: Array<T>) => T): number {
        const delta = ctx.stackPos - startPos
        const producerArgs = Functions.extractArguments(lambda)
        const hasRest = Functions.hasRestArgument(producerArgs)

        return hasRest ?
            delta + producerArgs.length - 1 : // e.g. (c, ...rest) => {}
            producerArgs.length // e.g. (l, r) => {}
    }

    static handleNTProduction<T>(ctx: Context<T>, lambda: (ctx: Context<T>) => Result, producer?: (...v: Array<T>) => T, nbArgs?: number): Result {

        const startPos = ctx.stackPos

        // run encapsulated lambda
        const res = lambda(ctx)

        if (res !== Result.Parsed || !producer)
            return res

        const args = new Array<T>()
        let count = nbArgs ? nbArgs : Context.calculateStackDepth(ctx, startPos, producer)

        while (count > 0 && !ctx._stack.isEmpty) {
            args.unshift(ctx._stack.pop())
            count--
        }

        ctx._stack.push(producer(...args))

        return Result.Parsed
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