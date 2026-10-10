export default abstract class Visitor {

    public static readonly AUTO_TRAVERS_PROPERTY_NAME:string = 'AUTO_TRAVERS' as const
    public static readonly AUTO_TRAVERS?:boolean = false

    /* istanbul ignore next */
    protected constructor() { }

}