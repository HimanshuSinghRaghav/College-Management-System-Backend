const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const pdfSchema = new mongoose.Schema({
  subjectCode: {
    type: String,
    required : true
  },
  year: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  file: {
    type: String,
    required: true
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Pdf', pdfSchema);