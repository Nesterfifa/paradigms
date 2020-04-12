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
const Gauss = createOperation(
        (a, b, c, x) => a*Math.exp(-((x - b) / c) * ((x - b) / c) / 2),
        "gauss",
        (arg, a, b, c, x) => new Multiply(
            new Gauss(Const.ONE, b, c, x),
            new Add(
                a.diff(arg),
                new Multiply(
                    a,
                    new Negate(new Divide(
                        new Multiply(new Subtract(x, b), new Subtract(x, b)),
                        new Multiply(new Multiply(c, c), Const.TWO))).diff(arg)))));

const parse = function(expression) {
    expression = expression.split(" ").filter(t => t.length > 0);

    const OPERATIONS = {
        "+": Add,
        "-": Subtract,
        "/": Divide,
        "*": Multiply,
        "negate": Negate,
        "gauss": Gauss
    };

    const VARIABLES = {
        'x': new Variable('x'),
        'y': new Variable('y'),
        'z': new Variable('z')
    };

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