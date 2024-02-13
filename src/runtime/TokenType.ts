enum TokenType {
    NULL= '',
    COMMENT = 'comment',
    PUNCTUATION = 'punctuation',
    PROPERTY = 'property',
    BOOLEAN = 'boolean',
    NUMBER = 'number',
    CONSTANT = 'constant',
    SYMBOL = 'symbol',
    STRING = 'string',
    CHAR = 'char',
    OPERATOR = 'operator',
    KEYWORD = 'keyword',
    FUNCTION = 'function',
    REGEX = 'regex',
    VARIABLE = 'variable'
}

function getKeyOf(value: string):string {
    const index = (<Array<string>>Object.values(TokenType)).indexOf(value);
    const key = Object.keys(TokenType)[index];

    return key
}

export { TokenType, getKeyOf };
