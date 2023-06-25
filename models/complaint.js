const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const complaintSchema = new Schema({
    studentName: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    year:{
        type:String,
        required:true
    }, 
    complaint: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['pending', 'resolved'],
        default: 'pending'
    },
    date: {
        type: Date,
        default: Date.now()
    }
}); 

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;