const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: [
      "Current Affairs",
      "Banking Awareness",
      "Static GK"
    ]
  },

  subcategory: {
    type: String,
    default: ""
  },

  question: {
    type: String,
    required: true
  },

  options: {
    A: {
      type: String,
      required: true
    },
    B: {
      type: String,
      required: true
    },
    C: {
      type: String,
      required: true
    },
    D: {
      type: String,
      required: true
    }
  },

  correctAnswer: {
    type: String,
    required: true,
    enum: ["A", "B", "C", "D"]
  },

  explanation: {
    type: String,
    default: ""
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Question", questionSchema);