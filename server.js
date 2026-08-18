const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
require("dotenv").config();

const Book = require("./models/Book");
const Topic = require("./models/Topic");
const Note = require("./models/Note");
const Question = require("./models/Question");

const app = express();

app.use(session({
  secret: "study-tracker-secret",
  resave: false,
  saveUninitialized: false
}));

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



app.get("/mcq", async (req, res) => {

  const currentAffairs = await Question.countDocuments({
    category: "Current Affairs"
  });

  const bankingAwareness = await Question.countDocuments({
    category: "Banking Awareness"
  });

  const staticGK = await Question.countDocuments({
    category: "Static GK"
  });

  res.render("mcq", {
    currentAffairs,
    bankingAwareness,
    staticGK
  });
});

// ADD MCQ PAGE
app.get("/mcq/add", (req, res) => {
  res.render("add-question");
});


// SAVE MCQ
app.post("/mcq/add", async (req, res) => {

  try {

    await Question.create({
      category: req.body.category,
      subcategory: req.body.subcategory,
      question: req.body.question,

      options: {
        A: req.body.optionA,
        B: req.body.optionB,
        C: req.body.optionC,
        D: req.body.optionD
      },

      correctAnswer: req.body.correctAnswer,

      explanation: req.body.explanation
    });

    res.redirect("/mcq");

  } catch (error) {

    console.log(error);

    res.status(500).send("Error adding question");

  }

});

// START MCQ PRACTICE
app.get("/mcq/practice", async (req, res) => {

  try {

    const category = req.query.category;

    if (!category) {
      return res.redirect("/mcq");
    }

    // Get 100 random questions
    const questions = await Question.aggregate([
      {
        $match: {
          category: category
        }
      },
      {
        $sample: {
          size: 100
        }
      }
    ]);

    if (questions.length === 0) {
      return res.send("No questions available in this category.");
    }

    // Store practice session
    req.session.practice = {
      category: category,
      questions: questions.map(q => q._id.toString()),
      currentIndex: 0,
      correct: 0,
      wrong: 0
    };

    res.redirect("/mcq/question");

  } catch (error) {

    console.log(error);
    res.status(500).send("Error starting practice");

  }

});

// SHOW CURRENT QUESTION
app.get("/mcq/question", async (req, res) => {

  try {

    const practice = req.session.practice;

    if (!practice) {
      return res.redirect("/mcq");
    }

    const questionId = practice.questions[practice.currentIndex];

    const question = await Question.findById(questionId);

    if (!question) {
      return res.redirect("/mcq");
    }

    res.render("practice-question", {
      question,
      current: practice.currentIndex + 1,
      total: practice.questions.length,
      category: practice.category
    });

  } catch (error) {

    console.log(error);
    res.status(500).send("Error loading question");

  }

});
// CHECK ANSWER
app.post("/mcq/answer", async (req, res) => {

  try {

    const practice = req.session.practice;

    if (!practice) {
      return res.redirect("/mcq");
    }

    const questionId =
      practice.questions[practice.currentIndex];

    const question =
      await Question.findById(questionId);

    const selectedAnswer =
      req.body.answer;

    const isCorrect =
      selectedAnswer === question.correctAnswer;

    if (isCorrect) {
      practice.correct++;
    } else {
      practice.wrong++;
    }

    practice.lastAnswer = {
      selectedAnswer: selectedAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      isCorrect: isCorrect
    };

    req.session.save(() => {

      res.render("answer-result", {
        question,
        selectedAnswer,
        isCorrect,
        current: practice.currentIndex + 1,
        total: practice.questions.length
      });

    });

  } catch (error) {

    console.log(error);
    res.status(500).send("Error checking answer");

  }

});
// NEXT QUESTION
app.get("/mcq/next", (req, res) => {

  const practice = req.session.practice;

  if (!practice) {
    return res.redirect("/mcq");
  }

  practice.currentIndex++;

  if (practice.currentIndex >= practice.questions.length) {
    return res.redirect("/mcq/result");
  }

  res.redirect("/mcq/question");

});
// PRACTICE RESULT
app.get("/mcq/result", (req, res) => {

  const practice = req.session.practice;

  if (!practice) {
    return res.redirect("/mcq");
  }

  const total = practice.questions.length;

  const percentage =
    total === 0
      ? 0
      : ((practice.correct / total) * 100).toFixed(1);

  res.render("practice-result", {
    category: practice.category,
    total,
    correct: practice.correct,
    wrong: practice.wrong,
    percentage
  });

});

app.listen(process.env.PORT, () => {
  console.log("Server Started");
});
