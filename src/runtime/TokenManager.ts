import Token from './Token.ts'
import { TokenType } from './TokenType.ts'

export default class TokenManager {

    readonly _tokens: Array<Token>

    get tokens(): Array<Token> {
        return [...this._tokens]
    }

    get pos(): number {
        return this._tokens.length
    }

    set pos(value: number) {
        this._tokens.splice(value)
    }

    constructor() {
        this._tokens = new Array<Token>()
    }

    create(symbol: string, pos: number, type: TokenType = TokenType.DEFAULT): void {
        this.append(new Token(symbol, pos, type))
    }

    append(token: Token): void {
        this._tokens.push(token)
    }

    consume(): Token | undefined {
        return this._tokens.pop()
    }

}
