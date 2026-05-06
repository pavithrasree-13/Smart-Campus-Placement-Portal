const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = "smart_campus_key_2026";

// --- PRE-START CHECK: ENSURE UPLOADS FOLDER EXISTS ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 1. Database Connection
mongoose.connect('mongodb://127.0.0.1:27017/smartCampusDB')
    .then(() => console.log("Smart Campus DB Connected - Enhanced Version Ready"))
    .catch(err => console.error("Database connection error:", err));

// 2. Models

const studentSchema = new mongoose.Schema({
    registrationNo: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, default: "" }, 
    isFirstLogin: { type: Boolean, default: true },
    role: { type: String, default: "student" }, 
    gender: { type: String, default: "" },
    department: { type: String, default: "Computer Science and Engineering" },
    cgpa: { type: Number, default: 0 },
    skills: { type: [String], default: [] },
    resumeUrl: { type: String, default: "" },
    otp: { type: String, default: null }, 
    applications: [{
        jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
        companyName: String,
        status: { type: String, default: "Applied" }, 
        appliedDate: { type: Date, default: Date.now }
    }]
});

const Student = mongoose.model('Student', studentSchema);

const jobSchema = new mongoose.Schema({
    companyName: String,
    role: String,
    ctc: String,
    minCGPA: { type: Number, default: 0 }, 
    deptCriteria: { type: [String], default: [] }, 
    status: { type: String, default: "Open" },
    postedDate: { type: Date, default: Date.now },
    rounds: { type: [String], default: ["Aptitude", "Technical", "HR"] } 
});

const Job = mongoose.model('Job', jobSchema);

// 3. Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        cb(null, req.body.registrationNo + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
app.use('/uploads', express.static('uploads'));

// 4. Routes

// LOGIN - Updated to ensure full sync with applications array
app.post('/api/login', async (req, res) => {
    try {
        const { registrationNo, password } = req.body;
        const student = await Student.findOne({ registrationNo });
        
        if (student && await bcrypt.compare(password, student.password)) {
            const token = jwt.sign({ id: student._id }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ 
                token, 
                isFirstLogin: student.isFirstLogin, 
                name: student.name, 
                registrationNo: student.registrationNo,
                role: student.role,
                // CRITICAL: Send latest data so frontend can persist applied status
                applications: student.applications,
                cgpa: student.cgpa,
                department: student.department
            });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ message: "Login server error" });
    }
});

// CHANGE PASSWORD
app.post('/api/change-password', async (req, res) => {
    try {
        const { registrationNo, newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await Student.findOneAndUpdate(
            { registrationNo }, 
            { password: hashedPassword, isFirstLogin: false },
            { new: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Password update failed" });
    }
});

// STUDENT: APPLY FOR JOB
app.post('/api/applications/apply', async (req, res) => {
    try {
        const { registrationNo, jobId, companyName } = req.body;
        const student = await Student.findOne({ registrationNo });
        const alreadyApplied = student.applications.some(app => app.jobId.toString() === jobId);
        
        if (alreadyApplied) {
            return res.status(400).json({ message: "Already applied for this job" });
        }

        await Student.findOneAndUpdate(
            { registrationNo },
            { $push: { applications: { jobId, companyName, status: "Applied" } } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Application failed" });
    }
});

// ADMIN: UPDATE APPLICATION STATUS
app.post('/api/admin/update-status', async (req, res) => {
    try {
        const { registrationNo, jobId, newStatus } = req.body;
        await Student.updateOne(
            { registrationNo, "applications.jobId": jobId },
            { $set: { "applications.$.status": newStatus } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Status update failed" });
    }
});

// ADMIN: STUDENT 360 & BATCH MANAGEMENT
app.get('/api/admin/students', async (req, res) => {
    try {
        const students = await Student.find({}, 'name registrationNo department cgpa resumeUrl applications role');
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch student data" });
    }
});

// ADMIN: AUTOMATED SHORTLISTING ENGINE
app.get('/api/admin/shortlist/:jobId', async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId);
        const eligibleStudents = await Student.find({
            cgpa: { $gte: job.minCGPA },
            department: { $in: job.deptCriteria }
        });
        res.json(eligibleStudents);
    } catch (err) {
        res.status(500).json({ message: "Shortlisting failed" });
    }
});

// ADMIN: POST NEW JOB
app.post('/api/jobs', async (req, res) => {
    try {
        const newJob = new Job(req.body);
        await newJob.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed to post job" });
    }
});

// STUDENT: GET JOBS
app.get('/api/jobs', async (req, res) => {
    const jobs = await Job.find();
    res.json(jobs);
});

// PROFILE UPDATE
app.put('/api/update-profile', async (req, res) => {
    try {
        const { registrationNo, gender, cgpa, skills, department } = req.body;
        const student = await Student.findOneAndUpdate(
            { registrationNo }, 
            { gender, cgpa, skills, department }, 
            { new: true }
        );
        res.json({ success: true, student });
    } catch (err) {
        res.status(500).json({ message: "Update failed" });
    }
});

// RESUME UPLOAD
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
    try {
        const resumePath = `/uploads/${req.file.filename}`;
        await Student.findOneAndUpdate({ registrationNo: req.body.registrationNo }, { resumeUrl: resumePath });
        res.json({ success: true, resumeUrl: resumePath });
    } catch (err) {
        res.status(500).json({ message: "Upload failed" });
    }
});

// EMERGENCY ADMIN RESET ROUTE
app.get('/api/reset-admin', async (req, res) => {
    try {
        console.log("Resetting Admin Account...");
        const hashedPassword = await bcrypt.hash("college123", 10);
        await Student.deleteOne({ registrationNo: "ADMIN001" }); 
        
        const adminUser = new Student({
            registrationNo: "ADMIN001",
            name: "TPO Admin",
            password: hashedPassword,
            isFirstLogin: false,
            role: "admin",
            department: "Placement Cell",
            gender: "N/A",
            cgpa: 0,
            skills: [],
            resumeUrl: "",
            applications: []
        });

        await adminUser.save();
        res.send("Success! Admin account ADMIN001 is ready. Password: college123");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error resetting admin: " + err.message);
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));