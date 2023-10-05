const {Schema, model} = require('mongoose');

const todoSchema = Schema({
    title: {
        type: String

    },
});

// first param is name of
const todo_model = model('Todo', todoSchema)

module.exports = todo_model;