const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken')
const path = require('path');
const fs = require('fs');

const sendEmail = require('../utils/nodemailer')
const Student = require('../models/student')
const Subject = require('../models/subject')
const Faculty = require('../models/faculty')
const Pdf = require('../models/pdf')
const Attendence = require('../models/attendence')
const Mark = require('../models/marks')
const QuestionPaper = require('../models/questionPaper')
const Question = require('../models/questions')
const keys = require('../config/key')

//File Handler
const bufferConversion = require('../utils/bufferConversion')
const cloudinary = require('../utils/cloudinary')


const validateFacultyLoginInput = require('../validation/facultyLogin')
const validateFetchStudentsInput = require('../validation/facultyFetchStudent')
const validateFacultyUpdatePassword = require('../validation/FacultyUpdatePassword')
const validateForgotPassword = require('../validation/forgotPassword')
const validateOTP = require('../validation/otpValidation')
const validateFacultyUploadMarks = require('../validation/facultyUploadMarks')


const multer = require('multer');


const storage = multer.diskStorage({
  destination: './public/pdfs',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).single('pdf');

function checkFileType(file, cb) {
  const filetypes = /pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: PDF Only!');
  }
}



  

module.exports = {
    facultyLogin: async (req, res, next) => {
        try {
            const { errors, isValid } = validateFacultyLoginInput(req.body);
            // Check Validation
            if (!isValid) {
              return res.status(400).json(errors);
            }
            const { registrationNumber, password } = req.body;

            const faculty = await Faculty.findOne({ registrationNumber })
            if (!faculty) {
                errors.registrationNumber = 'Registration number not found';
                return res.status(404).json(errors);
            }
            const isCorrect = await bcrypt.compare(password, faculty.password)
            if (!isCorrect) {
                errors.password = 'Invalid Credentials';
                return res.status(404).json(errors);
            }
            const payload = {
                id: faculty.id, faculty
            };
            jwt.sign(
                payload,
                keys.secretOrKey,
                { expiresIn: 3600 },
                (err, token) => {
                    res.json({
                        success: true,
                        token: 'Bearer ' + token
                    });
                }
            );
        }
        catch (err) {
            console.log("Error in faculty login", err.message)
        }
    },
    fetchStudents: async (req, res, next) => {
        try {
            const { errors, isValid } = validateFetchStudentsInput(req.body);
            if (!isValid) {
                return res.status(400).json(errors);
            }
            const { department, year, section } = req.body;
            const subjectList = await Subject.find({ department, year })
            if (subjectList.length === 0) {
                errors.department = 'No Subject found in given department';
                return res.status(404).json(errors);
            }
            const students = await Student.find({ department, year, section })
            if (students.length === 0) {
                errors.department = 'No Student found'
                return res.status(404).json(errors);
            }
            res.status(200).json({
                result: students.map(student => {
                    var student = {
                        _id: student._id,
                        registrationNumber: student.registrationNumber,
                        name: student.name
                    }
                    return student
                }),
                subjectCode: subjectList.map(sub => {
                    return sub.subjectCode
                })
            })
        }
        catch (err) {
            console.log("error in faculty fetchStudents", err.message)
        }

    },
    markAttendence: async (req, res, next) => {
        try {
            const { selectedStudents, subjectCode, department,
                year,
                section } = req.body
            
            const sub = await Subject.findOne({ subjectCode })

            //All Students
            const allStudents = await Student.find({ department, year, section })
            
            var filteredArr = allStudents.filter(function (item) {
                return selectedStudents.indexOf(item.id) === -1
            });

            
            //Attendence mark karne wale log nahi
            for (let i = 0; i < filteredArr.length; i++) {
                const pre = await Attendence.findOne({ student: filteredArr[i]._id, subject: sub._id })
                if (!pre) {
                    const attendence = new Attendence({
                        student: filteredArr[i],
                        subject: sub._id
                    })
                    attendence.totalLecturesByFaculty += 1
                    await attendence.save()
                }
                else {
                    pre.totalLecturesByFaculty += 1
                    await pre.save()
                }
            }
            for (var a = 0; a < selectedStudents.length; a++) {
                const pre = await Attendence.findOne({ student: selectedStudents[a], subject: sub._id })
                if (!pre) {
                    const attendence = new Attendence({
                        student: selectedStudents[a],
                        subject: sub._id
                    })
                    attendence.totalLecturesByFaculty += 1
                    attendence.lectureAttended += 1
                    await attendence.save()
                }
                else {
                    pre.totalLecturesByFaculty += 1
                    pre.lectureAttended += 1
                    await pre.save()
                }
            }
            res.status(200).json({ message: "done" })
        }
        catch (err) {
            console.log("error", err.message)
            return res.status(400).json({ message: `Error in marking attendence${err.message}` })
        }
    },
    uploadMarks: async (req, res, next) => {
        try {
            const { errors, isValid } = validateFacultyUploadMarks(req.body);

            // Check Validation
            if (!isValid) {
                return res.status(400).json(errors);
            }
            const { subjectCode, exam, totalMarks, marks, department, year,
                section } = req.body
            const subject = await Subject.findOne({ subjectCode })
            const isAlready = await Mark.find({ exam, department, section, subjectCode:subject._id })
            if (isAlready.length !== 0) {
                errors.exam = "You have already uploaded marks of given exam"
                return res.status(400).json(errors);
            }
            for (var i = 0; i < marks.length; i++) {
                const newMarks = await new Mark({
                    student: marks[i]._id,
                    subject: subject._id,
                    exam,
                    department,
                    section,
                   
                    marks: marks[i].value,
                    totalMarks
                })
                await newMarks.save()
            }
            res.status(200).json({message:"Marks uploaded successfully"})
        }
        catch (err) {
            console.log("Error in uploading marks",err.message)
        }
        
    },
    getAllSubjects: async (req, res, next) => {
        try {
            const allSubjects = await Subject.find({})
            if (!allSubjects) {
                return res.status(404).json({ message: "You havent registered any subject yet." })
            }
            res.status(200).json({ allSubjects })
        }
        catch (err) {
            res.status(400).json({ message: `error in getting all Subjects", ${err.message}` })
        }
    },
    updatePassword: async (req, res, next) => {
        try {
            const { errors, isValid } = validateFacultyUpdatePassword(req.body);
            if (!isValid) {
                return res.status(400).json(errors);
            }
            const { registrationNumber, oldPassword, newPassword, confirmNewPassword } = req.body
            if (newPassword !== confirmNewPassword) {
                errors.confirmNewPassword = 'Password Mismatch'
                return res.status(404).json(errors);
            }
            const faculty = await Faculty.findOne({ registrationNumber })
            const isCorrect = await bcrypt.compare(oldPassword, faculty.password)
            if (!isCorrect) {
                errors.oldPassword = 'Invalid old Password';
                return res.status(404).json(errors);
            }
            let hashedPassword;
            hashedPassword = await bcrypt.hash(newPassword, 10)
            faculty.password = hashedPassword;
            await faculty.save()
            res.status(200).json({ message: "Password Updated" })
        }
        catch (err) {
            console.log("Error in updating password", err.message)
        }
    },

    uploadQuestion: async (req , res)=>{
        try {
            const { question} = req.body;
            if(!question){
                return res.status(400).json({ message: 'Please provide a valid question' });
            }
            // Create a new question document
            const newQuestion = new Question({
                question
            });
            // Save the question to the database
            await newQuestion.save();
            res.status(201).json({ message: 'Question successfully added' , data:req.body });
        } catch (err) {
            console.log(err.message);
            res.status(500).json({ message: 'Error adding question' });
        }
    },

    uploadQuestionPaper: async (req, res, next)=>{
        try {
            // Destructure the request body
            const { name, questions , subjectCode, department , year} = req.body;
            // Create a new instance of the QuestionPaper model
            const newQuestionPaper = new QuestionPaper({
                name: name,
                question: questions,
                subjectCode:subjectCode,
                department:department,
                year:year
            });
            // Save the question paper to the database
            await newQuestionPaper.save();
            // Send a successful response
            res.status(200).json({ message: "Question paper sucessfully uploaded" });
        } catch (err) {
            // Log the error message to the console
            console.log("Error in uploading question paper", err.message);
            // Send an error response
            res.status(500).json({ message: "Error uploading question paper" });
        }
    },
    forgotPassword: async (req, res, next) => {
        try {
            const { errors, isValid } = validateForgotPassword(req.body);
            if (!isValid) {
                return res.status(400).json(errors);
            }
            const { email } = req.body
            const faculty = await Faculty.findOne({ email })
            if (!faculty) {
                errors.email = "Email Not found, Provide registered email"
                return res.status(400).json(errors)
            }
            function generateOTP() {
                var digits = '0123456789';
                let OTP = '';
                for (let i = 0; i < 6; i++) {
                    OTP += digits[Math.floor(Math.random() * 10)];
                }
                return OTP;
            }
            const OTP = await generateOTP()
            faculty.otp = OTP
            await faculty.save()
            await sendEmail(faculty.email, OTP, "OTP")
            res.status(200).json({ message: "check your registered email for OTP" })
            const helper = async () => {
                faculty.otp = ""
                await faculty.save()
            }
            setTimeout(function () {
                helper()
            }, 300000);
        }
        catch (err) {
            console.log("Error in sending email", err.message)
        }
    },
    postOTP: async (req, res, next) => {
        try {
            const { errors, isValid } = validateOTP(req.body);
            if (!isValid) {
                return res.status(400).json(errors);
            }
            const { email, otp, newPassword, confirmNewPassword } = req.body
            if (newPassword !== confirmNewPassword) {
                errors.confirmNewPassword = 'Password Mismatch'
                return res.status(400).json(errors);
            }
            const faculty = await Faculty.findOne({ email });
            if (faculty.otp !== otp) {
                errors.otp = "Invalid OTP, check your email again"
                return res.status(400).json(errors)
            }
            let hashedPassword;
            hashedPassword = await bcrypt.hash(newPassword, 10)
            faculty.password = hashedPassword;
            await faculty.save()
            return res.status(200).json({ message: "Password Changed" })
        }
        catch (err) {
            console.log("Error in submitting otp", err.message)
            return res.status(200)
        }

    },
    updateProfile: async (req, res, next) => {
        console.log(req.file.path)
        // res.send("hh")
        try {
            const { email, gender, facultyMobileNumber, aadharCard } = req.body;
            const userPostImg = req.file.path;
            const faculty = await Faculty.findOne({ email });
            console.log(faculty)
            if (gender) {
              faculty.gender = gender;
              await faculty.save();
            }
            if (facultyMobileNumber) {
              faculty.facultyMobileNumber = facultyMobileNumber;
              await faculty.save();
            }
            if (aadharCard) {
              faculty.aadharCard = aadharCard;
              await faculty.save();
            }
            faculty.avatar = req.file.path
            await faculty.save();
            res.status(200).json(faculty);
          } catch (err) {
            console.log("Error in updating Profile", err);
            res.status(500).json({ message: "Failed to update profile" });
          }
    },



    uploadPdf: async (req, res) => {
        upload(req, res, (error) => {
            if (error) {
                return res.status(500).send({
                  message:req.body
                });
            }
            
            if (!req.body.year || !req.body.department || !req.body.subjectCode) {
                return res.status(400).send({
                  message: 'Year and department are required fields'
                });
            }
            
            if (req.body.file) {
                return res.status(400).send({
                  message: 'No file was provided', 
                  file: req.body
                });
            } else {
                const pdf = new Pdf({
                    subjectCode: req.body.subjectCode,
                    year: req.body.year,
                    department: req.body.department,
                    file: req.file.path
                });
                
                pdf.save((error) => {
                    if (error) {
                        return res.status(500).send({
                            message: 'Error while saving the PDF to the database'
                        });
                    }
                    
                    res.status(200).send({
                        message: 'PDF uploaded successfully'
                    });
                });
            }
        });
    }
    
      
}