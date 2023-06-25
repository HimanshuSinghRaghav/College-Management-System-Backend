const mongoose = require('mongoose');

const QuestionPaperSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    question: {
        type: String, 
        required: true
    },
    subjectCode: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    }
});

const QuestionPaper = mongoose.model('QuestionPaper', QuestionPaperSchema);

module.exports = QuestionPaper;