"use strict";

const cnst = (a) => () => a;

const variable = (name) => (...args) => args[VARIABLENUMS[name]];

const appliedOperands = (operands, args) => {
    let res = [];
    for (let i = 0; i < operands.length; i++) {
        res.push(operands[i](...args));
    }
    return res;
};

const operation = action => (...operands) => (...args) => action(...appliedOperands(operands, args));

const add = operation((a, b) => a + b);
const subtract = operation((a, b) => a - b);
const multiply = operation((a, b) => a * b);
const divide = operation((a, b) => a / b);
const negate = operation((x) => -x);
const abs = operation(Math.abs);
const iff = operation((x, y, z) => x >= 0 ? y : z);

const VARIABLENUMS = {
    "x": 0,
    "y": 1,
    "z": 2
};

const VARIABLES = {
    "x": variable("x"),
    "y": variable("y"),
    "z": variable("z"),
};

const CONSTS = {
    one: cnst(1),
    two: cnst(2),
};

for (let c in CONSTS) {
    this[c] = CONSTS[c];
}

for (let vrbl in VARIABLES) {
    this[vrbl] = VARIABLES[vrbl];
}

const parse = function(expression) {
    expression = expression.split(" ").filter(t => t.length > 0);
    let stack = [];

    const OPERATIONS = {
        "+": add,
        "-": subtract,
        "/": divide,
        "*": multiply,
        "iff": iff,
        "abs": abs,
        "negate": negate,
    };

    const ARGSCNT = {
        "+": 2,
        "*": 2,
        "/": 2,
        "-": 2,
        "iff": 3,
        "abs": 1,
        "negate": 1,
    };

    for(let token of expression) {
        if (token in CONSTS) {
            stack.push(CONSTS[token]);
        } else if (token in VARIABLES) {
            stack.push(VARIABLES[token]);
        } else if (token in OPERATIONS) {
            let args = [];
            for (let i = 0; i < ARGSCNT[token]; i++) {
                args.unshift(stack.pop());
            }
            stack.push(OPERATIONS[token](...args));
        } else {
            stack.push(cnst(parseInt(token)));
        }
    }
    return stack.pop();
};