/**
 * ToDo List:
 *
 * 1. Add tags (e.g. 'work', 'social', 'miscellaneous'...) so we can add one or more tag to todos
 * (many-to-many relationship between todos and tags). We should be able to add tags and find todos linked
 * to specific tag(s) directly from your REST API.
 *
 * 2. Add database persistence such that todos and tags are not lost upon server restart. You are free to choose
 * any database system you want (make sure you are using an asyncio-based DB driver/interface with Python).
 *
 * 3. Your API should comply with our specs (source code). As an example, a compliant API with swagger can be
 * tested from http://todospecs.thing.zone/?http://todo.thing.zone.
 * @type {*|module:koa-router|Router|undefined}
 */

const router = require('koa-router')();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const mongoose = require('mongoose'); // Add Mongoose for MongoDB integration
require('dotenv').config({ path: './config.env' })

const app = new Koa();

// Define MongoDB connection URL (make sure to replace 'mongodb://localhost/todoapp' with your MongoDB URL)
const mongoDBURL = process.env.MONGODB_URI || 'mongodb://localhost/todoapp';
mongoose.connect(mongoDBURL, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

db.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

db.once('open', () => {
  console.log('Connected to MongoDB...');
});

// Create Mongoose schemas for MongoDB
const todoSchema = new mongoose.Schema({
  title: String,
  order: Number,
  completed: Boolean,
  tags: [String],
});

const Todo = mongoose.model('Todo', todoSchema);

// Route to add tags to a specific todo
router.post('/todos/:id/tags', addTagToTodo);

// Route to list tags for a specific todo
router.get('/todos/:id/tags', listTagsForTodo);

// Route to list todos associated with a specific tag
router.get('/tags/:tag/todos', listTodosWithTag);

router.get('/todos/', list)
    .del('/todos/', clear)
    .post('/todos/', add)
    .get('todo', '/todos/:id', show)
    .patch('/todos/:id', update)
    .del('/todos/:id', remove);

async function saveTodosToDatabase() {
  try {
    for (const id in todos) {
      const todo = todos[id];
      const { title, order, completed, tags } = todo;

      await Todo.findByIdAndUpdate(id, { title, order, completed, tags });
    }
  } catch (error) {
    console.error('Error saving todos to the database:', error);
  }
}

// Load todos from the database on server start
async function loadTodosFromDatabase() {
  try {
    const todos = await Todo.find();
    todos.forEach((todo) => {
      const id = todo._id.toString();
      todos[id] = {
        title: todo.title,
        order: todo.order,
        completed: todo.completed,
        tags: todo.tags,
      };
    });

    // Find the maximum id in the todos and set nextId to a value greater than that
    nextId = Math.max(...Object.keys(todos).map(Number)) + 1;
  } catch (error) {
    console.error('Error loading todos:', error);
  }
}

// Load todos from the database on server start
loadTodosFromDatabase().catch((err) => console.error('Error loading todos:', err));

async function addTagToTodo(ctx) {
  const id = ctx.params.id;
  const tag = ctx.request.body.tag;

  try {
    const todo = await Todo.findById(id);

    if (!todo) {
      ctx.throw(404, { error: 'Todo not found' });
    }

    if (!tag) {
      ctx.throw(400, { error: '"tag" is a required field' });
    }

    if (typeof tag !== 'string' || !tag.length) {
      ctx.throw(400, { error: '"tag" must be a string with at least one character' });
    }

    if (!todo.tags.includes(tag)) {
      todo.tags.push(tag);
      await todo.save();
    }

    ctx.status = 204;
  } catch (error) {
    ctx.throw(500, { error: 'Internal Server Error' });
  }
}

async function listTagsForTodo(ctx) {
  const id = ctx.params.id;

  try {
    const todo = await Todo.findById(id);

    if (!todo) {
      ctx.throw(404, { error: 'Todo not found' });
    }

    ctx.body = { tags: todo.tags };
  } catch (error) {
    ctx.throw(500, { error: 'Internal Server Error' });
  }
}

async function listTodosWithTag(ctx) {
  const tag = ctx.params.tag;

  try {
    const todosWithTag = await Todo.find({ tags: tag });

    const formattedTodos = todosWithTag.map((todo) => ({
      id: todo._id,
      title: todo.title,
      order: todo.order,
      completed: todo.completed,
      tags: todo.tags,
    }));

    ctx.body = formattedTodos;
  } catch (error) {
    ctx.throw(500, { error: 'Internal Server Error' });
  }
}

async function list(ctx) {
  ctx.body = Object.keys(todos).map(k => {
    todos[k].id = k;
    return todos[k];
  });
}

async function clear(ctx) {
  todos = {};
  ctx.status = 204;
}

async function add(ctx) {
  const todo = ctx.request.body;
  if (!todo.title) ctx.throw(400, {'error': '"title" is a required field'});
  const title = todo.title;
  if (!typeof data === 'string' || !title.length) ctx.throw(400, {'error': '"title" must be a string with at least one character'});

  todo['completed'] = todo['completed'] || false;
  todo['url'] = 'https://' + ctx.host + router.url('todo', nextId);
  todos[nextId++] = todo;

  ctx.status = 303;
  ctx.set('Location', todo['url']);
}

async function show(ctx) {
  const id = ctx.params.id;
  const todo = todos[id]
  if (!todo) ctx.throw(404, {'error': 'Todo not found'});
  todo.id = id;
  ctx.body = todo;
}

async function update(ctx) {
  const id = ctx.params.id;
  const todo = todos[id];

  Object.assign(todo, ctx.request.body);

  ctx.body = todo;
}

async function remove(ctx) {
  const id = ctx.params.id;

  try {
    const todo = await Todo.findByIdAndRemove(id);

    if (!todo) {
      ctx.throw(404, { error: 'Todo not found' });
    }

    ctx.status = 204;
  } catch (error) {
    ctx.throw(500, { error: 'Internal Server Error' });
  }
}

let todos = {
  0: {'title': 'build an API', 'order': 1, 'completed': false},
  1: {'title': '?????', 'order': 2, 'completed': false},
  2: {'title': 'profit!', 'order': 3, 'completed': false}
};

let nextId = 3;

// Save todos to the database on server shutdown
process.on('SIGINT', async () => {
  await saveTodosToDatabase();
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

app
    .use(bodyParser())
    .use(cors())
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(8080, () => {
  console.log('Server is running on port 8080');
});
