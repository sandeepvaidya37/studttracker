const mongoose = require("mongoose");

const topicSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book",
    required: true
  },
  name: {
    type: String,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  solvedQuestions: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model("Topic", topicSchema);