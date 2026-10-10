export default abstract class VisitContext<T> {

    abstract get result(): Array<T> | T

}