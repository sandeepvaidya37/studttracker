const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const Book = require("./models/Book");
const Topic = require("./models/Topic");
const Note = require("./models/Note");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");



mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));


// HOME
app.get("/", async (req, res) => {
  const books = await Book.find();
  res.render("index", { books });
});


// ADD BOOK
app.post("/add-book", async (req, res) => {
  await Book.create({ name: req.body.name });
  res.redirect("/");
});


// BOOK PAGE
app.get("/book/:id", async (req, res) => {
  const book = await Book.findById(req.params.id);
  const topics = await Topic.find({ bookId: req.params.id });
  const notes = await Note.find({ bookId: req.params.id }).sort({ createdAt: -1 });

  let totalQ = 0;
  let solvedQ = 0;

  topics.forEach(t => {
    totalQ += t.totalQuestions;
    solvedQ += t.solvedQuestions;
  });

  let progress = totalQ === 0 ? 0 : ((solvedQ / totalQ) * 100).toFixed(1);

  let bestTopic = null;
  let weakTopic = null;

  if (topics.length > 0) {
    let sorted = [...topics].sort((a, b) => {
      let pa = a.totalQuestions === 0 ? 0 : a.solvedQuestions / a.totalQuestions;
      let pb = b.totalQuestions === 0 ? 0 : b.solvedQuestions / b.totalQuestions;
      return pb - pa;
    });

    bestTopic = sorted[0];
    weakTopic = sorted[sorted.length - 1];
  }

  res.render("book", {
    book,
    topics,
    notes,
    totalQ,
    solvedQ,
    progress,
    bestTopic,
    weakTopic
  });
});


// ADD TOPIC
app.post("/book/:id/add-topic", async (req, res) => {
  await Topic.create({
    bookId: req.params.id,
    name: req.body.name,
    totalQuestions: req.body.totalQuestions
  });

  res.redirect("/book/" + req.params.id);
});


// UPDATE SOLVED
app.post("/topic/:id/update", async (req, res) => {
  const topic = await Topic.findById(req.params.id);

  await Topic.findByIdAndUpdate(req.params.id, {
    solvedQuestions: req.body.solvedQuestions
  });

  res.redirect("/book/" + topic.bookId);
});


// AUTO ADD
app.get("/topic/:id/add/:num", async (req, res) => {
  const topic = await Topic.findById(req.params.id);

  let updated = topic.solvedQuestions + Number(req.params.num);

  if (updated > topic.totalQuestions) {
    updated = topic.totalQuestions;
  }

  await Topic.findByIdAndUpdate(req.params.id, {
    solvedQuestions: updated
  });

  res.redirect("/book/" + topic.bookId);
});


// DELETE TOPIC
app.get("/topic/:id/delete", async (req, res) => {
  const topic = await Topic.findById(req.params.id);

  await Topic.findByIdAndDelete(req.params.id);

  res.redirect("/book/" + topic.bookId);
});


// ADD NOTE
app.post("/book/:id/add-note", async (req, res) => {
  await Note.create({
    bookId: req.params.id,
    title: req.body.title,
    content: req.body.content
  });

  res.redirect("/book/" + req.params.id);
});


// DELETE NOTE
app.get("/note/:id/delete", async (req, res) => {
  const note = await Note.findById(req.params.id);

  await Note.findByIdAndDelete(req.params.id);

  res.redirect("/book/" + note.bookId);
});

app.listen(process.env.PORT, () => {
  console.log("Server Started");
});