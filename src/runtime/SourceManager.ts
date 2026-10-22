export default class SourceManager {

    private readonly _src: string
    private _pos: number

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

    get enhancedSource(): string {
        return `${this._src.substring(0, this._pos)}[${this._src.substring(this._pos, this._pos + 1)}]${this._src.substring(this._pos + 1)}`
    }

    constructor(src: string) {
        this._src = src
        this._pos = 0
    }

    next(): void {
        if (this.current !== null)
            this._pos++
    }

    assertComplete(): void {
        if (this._pos != this._src.length)
            throw new Error(`Source not completelly parsed. Parsing stopped at position: ${this._pos} in:\n${this.enhancedSource}`)
    }

}
