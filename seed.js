const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Database URL
const mongoURI = 'mongodb://127.0.0.1:27017/smartCampusDB';

const studentSchema = new mongoose.Schema({
    registrationNo: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    isFirstLogin: { type: Boolean, default: true },
    role: { type: String, default: "student" }
});

const Student = mongoose.model('Student', studentSchema);

async function seedUser() {
    await mongoose.connect(mongoURI);
    
    // Scramble the initial password "college123"
    const hashedPassword = await bcrypt.hash("college123", 10);
    
    const pavi = new Student({
        registrationNo: "312323104169",
        password: hashedPassword,
        name: "PAVITHRASREE S",
        isFirstLogin: true,
        role: "student"
    });

    try {
        await pavi.save();
        console.log("Successfully created student: PAVITHRASREE S");
        console.log("Login with Reg No: 312323104169 and Password: college123");
    } catch (err) {
        console.log("User might already exist.");
    }
    
    mongoose.connection.close();
}

seedUser();