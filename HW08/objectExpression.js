"use strict";

function AbstractOperation(...operands) {
    this.operands = operands;
}
AbstractOperation.prototype = {
    evaluate: function(...args) {
        return this.action(...this.operands.map(x => x.evaluate(...args)));
    },
    toString: function() {
        return this.operands.map(x => x.toString()).join(" ") + " " + this.symbol;
    },
    diff: function(arg) {
        return this.diffRule(arg, ...this.operands);
    },
    prefix:  function() {
        return "(" + this.symbol + " " + this.operands.map(x => x.prefix()).join(" ") + ")";
    },
    postfix: function() {
        return "(" + this.operands.map(x => x.postfix()).join(" ") + " " + this.symbol + ")";
    }
};

const createOperation = function(action, symbol, diffRule) {
    let operation = function(...operands) {
        AbstractOperation.call(this, ...operands);
    };
    operation.prototype = Object.create(AbstractOperation.prototype);
    operation.prototype.action = action;
    operation.prototype.symbol = symbol;
    operation.prototype.diffRule = diffRule;
    operation.prototype.constructor = AbstractOperation;
    return operation;
};

function Const(value) {
    this.value = value;
}
Const.prototype = {
    evaluate: function() {
        return this.value;
    },
    toString: function() {
        return this.value.toString();
    },
    diff: function() {
        return Const.ZERO;
    },
    prefix: function() {
        return this.toString();
    },
    postfix: function() {
        return this.toString();
    }
};
Const.ZERO = new Const(0);
Const.ONE = new Const(1);
Const.TWO = new Const(2);

const VARIABLE_NUMS = {
    'x': 0,
    'y': 1,
    'z': 2
};
function Variable(name) {
    this.name = name;
    this.number = VARIABLE_NUMS[name];
}
Variable.prototype = {
    evaluate: function(...args) {
        return args[this.number];
    },
    toString: function() {
        return this.name;
    },
    diff: function(arg) {
        return arg === this.name ? Const.ONE : Const.ZERO;
    },
    prefix: function() {
        return this.toString();
    },
    postfix: function () {
        return this.toString();
    }
};
const Add = createOperation(
    (a, b) => a + b,
    "+",
    (arg, left, right) => new Add(left.diff(arg), right.diff(arg)));
const Subtract = createOperation(
    (a, b) => a - b,
    "-",
    (arg, left, right) => new Subtract(left.diff(arg), right.diff(arg)));
const Multiply = createOperation(
    (a, b) => a * b,
    "*",
    (arg, left, right) => new Add(new Multiply(left.diff(arg), right), new Multiply(left, right.diff(arg))));
const Divide = createOperation(
    (a, b) => a / b,
    "/",
    (arg, left, right) => new Divide(
        new Subtract(
            new Multiply(left.diff(arg), right),
            new Multiply(left, right.diff(arg))
        ),
        new Multiply(right, right)));
const Negate = createOperation(
    expr => -expr,
    "negate",
    (arg, expr) => new Negate(expr.diff(arg)));
const Mean = createOperation(
    (...args) => args.length === 0 ? 0 : args.reduce((sum, x) => sum + x) / args.length,
    "mean",
    (arg, ...args) => new Mean(...args.map(x => x.diff(arg))));
const Var = createOperation(
    (...args) => new Mean(...args.map(x => {
            const sub = new Subtract(new Const(x), new Mean(...args.map(v => new Const(v))));
            return new Multiply(sub, sub);
        })).evaluate(),
    "var",
    (arg, ...args) => new Mean(
        ...args.map(x => {
            const sub = new Subtract(x, new Mean(...args));
            return new Multiply(sub, sub).diff(arg);
        })));

const OPERATIONS = {
    "+": Add,
    "-": Subtract,
    "/": Divide,
    "*": Multiply,
    "negate": Negate,
    "mean": Mean,
    "var": Var
};

const VARIABLES = {
    'x': new Variable('x'),
    'y': new Variable('y'),
    'z': new Variable('z')
};

const parse = function(expression) {
    expression = expression.split(" ").filter(t => t.length > 0);

    let stack = [];
    for (let token of expression) {
        if (token in VARIABLES) {
            stack.push(VARIABLES[token]);
        } else if (token in OPERATIONS) {
            stack.push(new OPERATIONS[token](...stack.splice(-OPERATIONS[token].prototype.action.length)));
        } else {
            stack.push(new Const(Number(token)));
        }
    }
    return stack.pop();
};

const parsePostfix = parsePostPrefix(takeLastElement);
const parsePrefix = parsePostPrefix(takeFirstElement);

function parsePostPrefix(takeOperation) {
    return function(expression) {
        const source = new Source(expression);
        function parseSource() {
            const token = source.getToken();
            if (!isNaN(+token)) {
                return new Const(+token);
            } else if (token in VARIABLES) {
                return VARIABLES[token];
            } else if (token === '(') {
                return parseBrackets(source, takeOperation);
            } else if (token === undefined) {
                throw new EndOfFileError(0, false);
            } else {
                throw new TokenError(0, token);
            }
        }
        const res = parseSource();
        const checkEnd = source.getToken();
        if (checkEnd !== undefined) {
            const pos = source.pos;
            throw new EndOfFileError(pos,true, checkEnd);
        }
        return res;
    }
}

function parseBrackets(source, takeOperation) {
    const pos = source.pos;
    const tokens = getDataInBrackets(source, takeOperation);
    const operation = takeOperation(tokens);
    if (tokens.length !== OPERATIONS[operation].prototype.action.length
        && OPERATIONS[operation].prototype.action.length !== 0) {
        throw new ArgumentsCountError(takeOperation === takeLastElement ? pos : pos + operation.length,
            OPERATIONS[operation].prototype.action.length,
            tokens.length);
    }
    return new OPERATIONS[operation](...tokens);
}

function getDataInBrackets(source, takeOperation) {
    let data = [];
    const pos = source.pos;
    while (true) {
        const token = source.getToken();
        if (token === ')') {
            checkOperation(data[0], pos, takeFirstElement, takeOperation);
            checkOperation(data.slice(-1)[0], source.pos - 1, takeLastElement, takeOperation);
            return data;
        } else {
            if (data.length > 0) {
                const checker = (data.slice(-1)[0] instanceof AbstractOperation
                    || data.slice(-1)[0] instanceof Const
                    || data.slice(-1)[0] instanceof Variable);
                if (!(checker || data.length === 1 && data[0] in OPERATIONS && takeOperation === takeFirstElement)) {
                    throw new ArgumentsError(source.pos, data.slice(-1)[0]);
                }
            }
            data.push(parseToken(token, source, takeOperation));
        }
    }
}

const parseToken = (token, source, takeOperation) => {
    if (token === undefined) {
        throw new EndOfFileError(source.pos, false);
    } else if (!isNaN(+token)) {
        return new Const(+token);
    } else if (token in VARIABLES) {
        return VARIABLES[token];
    } else if (token in OPERATIONS) {
        return token;
    } else if (token === '(') {
        return parseBrackets(source, takeOperation);
    } else {
        throw new ArgumentsError(source.pos - token.length, token);
    }
}

function Source (data) {
    this.data = data;
    this.pos = 0;
}
Source.prototype.getToken = function() {
    while (this.data[this.pos] === ' ') {
        this.pos++;
    }
    if (this.pos === this.data.length) {
        return undefined;
    } else if (this.data[this.pos] === '(' || this.data[this.pos] === ')') {
        return this.data[this.pos++];
    } else {
        let token = [];
        while (this.pos < this.data.length
        && this.data[this.pos] !== ' '
        && this.data[this.pos] !== ')' && this.data[this.pos] !== '(') {
            token.push(this.data[this.pos++]);
        }
        return token.join("");
    }
}

const checkOperation = (token, pos, takeOperationFunction, usedTakeOperationFunction) => {
    if (!(token in OPERATIONS) && takeOperationFunction === usedTakeOperationFunction) {
        throw new OperationError(pos, token);
    }
}

function takeFirstElement(arr) {
    return arr.shift();
}

function takeLastElement(arr) {
    return arr.pop();
}

function CustomError(message) {
    this.message = message;
}
CustomError.prototype = Object.create(Error.prototype);
CustomError.prototype.constructor = CustomError;
CustomError.prototype.name = "CustomError";

const defineError = (error, name) => {
    error.prototype = Object.create(CustomError.prototype);
    error.prototype.constructor = error;
    error.prototype.name = name;
}

function OperationError(pos, token) {
    this.message = "Expected operation at pos " + (pos + 1) + ", found: " + token;
}
defineError(OperationError, "OperationError");

function TokenError(pos, token) {
    this.message = "Invalid token at pos " + (pos + 1) + ", token: " + token;
}
defineError(TokenError, "TokenError");

function ArgumentsError(pos, token) {
    this.message = "Invalid argument at pos " + (pos + 1) + ", token: " + token;
}
defineError(ArgumentsError, "ArgumentsError");

function ArgumentsCountError(pos, expected, found) {
    this.message = "Invalid arguments count at pos " + (pos + 1) + ", expected: " + expected + ", found: " + found;
}
defineError(ArgumentsCountError, "ArgumentsCountError");

function EndOfFileError(pos, expected, token) {
    this.message = (expected ? "Expected" : "Unexpected") + " end of file at pos " + (pos + 1)
        + (expected ? ", found: " + token : "");
}
defineError(EndOfFileError, "EndOfFileError");