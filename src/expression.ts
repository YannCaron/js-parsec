import Context from "./runtime/Context"
import { Parsem } from "./Parsem"
import Result from "./runtime/Result"

class Null<T> extends Parsem<T> {
    parse(_: Context<T>): Result {
        return Result.Parsed
    }
    toString(): string {
        return ''
    }
}

class Expression<T> extends Parsem<T> {

    private _ref: Parsem<T>
    
    public get ref() : Parsem<T> {
        return this._ref
    }
    
    public set ref(v : Parsem<T>) {
        this._ref = v;
    }
    
    constructor(ref: Parsem<T> = new Null<T>()) {
        super()
        this._ref = ref
    }

    parse(ctx: Context<T>): Result {
        return this.ref.parse(ctx)
    }
        
    toString(): string {
        return this.ref.toString()
    }

}

function expression<T>(ref?: Parsem<T>): Expression<T> {
    return new Expression<T>(ref)
}

export {expression, Expression}