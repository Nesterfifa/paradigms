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
    operation.constructor = AbstractOperation;
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

function CustomError(message) {
    this.message = message;
}
CustomError.prototype = Object.create(Error.prototype);
CustomError.constructor = Error;

const defineErrorPrototype = (error) => {
    error.prototype = Object.create(CustomError);
    error.constructor = CustomError;
}

function BracketError(pos, expected, opening) {
    this.message = expected ? "Expected" : "Unexpected" + opening ? "opening" : "closing" + " bracket at pos " + pos;
}
defineErrorPrototype(BracketError);

function OperationError(pos) {
    this.message = "Expected operation at pos " + pos;
}
defineErrorPrototype(OperationError);

function TokenError(pos) {
    this.message = "Invalid token at pos " + pos;
}
defineErrorPrototype(TokenError);

function ArgumentsError(pos) {
    this.message = "Invalid arguments at pos " + pos;
}
defineErrorPrototype(ArgumentsError);

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
            } else {
                throw new TokenError(0);
            }
        }
        const res = parseSource();
        if (source.getToken() !== undefined) {
            const pos = source.pos;
            throw new TokenError(pos);
        }
        return res;
    }
}

function parseBrackets(source, takeOperation) {
    const pos = source.pos;
    const tokens = getDataInBrackets(source, takeOperation);
    const operation = takeOperation(tokens);
    if (!(operation in OPERATIONS)) {
        throw new OperationError(pos);
    }
    if (!checkArgs(tokens) ||
        tokens.length !== OPERATIONS[operation].prototype.action.length && OPERATIONS[operation].prototype.action.length !== 0) {
        throw new ArgumentsError(pos);
    }
    return new OPERATIONS[operation](...tokens);
}

function getDataInBrackets(source, takeOperation) {
    let data = [];
    while (true) {
        const token = source.getToken();
        if (token === ')') {
            return data;
        } else if (token in VARIABLES) {
            data.push(VARIABLES[token]);
        } else if (!isNaN(+token)) {
            data.push(new Const(+token));
        } else if (token in OPERATIONS) {
            data.push(token);
        } else if (token === '(') {
            data.push(parseBrackets(source, takeOperation))
        } else {
            throw new TokenError(source.pos - token.length);
        }
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

function checkArgs(args) {
    for (let arg of args) {
        if (!(arg instanceof AbstractOperation || arg instanceof Const || arg instanceof Variable)) {
            return false;
        }
    }
    return true;
}

function takeFirstElement(mas) {
    return mas.shift();
}

function takeLastElement(mas) {
    return mas.pop();
}