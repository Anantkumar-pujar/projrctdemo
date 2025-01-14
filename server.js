const express = require('express');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv').config();


const app = express();
const port = process.env.PORT;

// PostgreSQL Configuration
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST ,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage });


// File Upload Form Route
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// File Upload Route
app.post('/upload', upload.single('file'), async (req, res) => {
    const {
        subject_name,
        subject_code,
        academic_year,
        category,
        uploaded_by,
        description,
    } = req.body;

    const file = req.file;

    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const query = `
    INSERT INTO uploads 
        (filename, filetype, filesize, uploaded_by, uploaded_at, description, subject_name, subject_code, academic_year, category, status) 
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9, 'pending')
`;
const values = [
    file.filename,     // Corresponds to 'filename'
    file.mimetype,     // Corresponds to 'filetype'
    file.size,         // Corresponds to 'filesize'
    uploaded_by,       // Corresponds to 'uploaded_by'
    description,       // Corresponds to 'description'
    subject_name,      // Corresponds to 'subject_name'
    subject_code,      // Corresponds to 'subject_code'
    academic_year,     // Corresponds to 'academic_year'
    category           // Corresponds to 'category'
];

        await pool.query(query, values);
        res.send('<h2>File uploaded successfully. Awaiting admin approval.</h2><a href="/">Go Back</a>');
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while saving the data.');
    }
});

// Admin Approve File Route
app.post('/approve/:id', async (req, res) => {
    const fileId = req.params.id;

    try {
        const query = `UPDATE uploads SET status = 'approved' WHERE id = $1`;
        const result = await pool.query(query, [fileId]);

        if (result.rowCount === 0) {
            return res.status(404).send('File not found.');
        }

        res.send('File approved successfully.');
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while approving the file.');
    }
});

// Admin Reject File Route
app.post('/reject/:id', async (req, res) => {
    const fileId = req.params.id;

    try {
        const query = `UPDATE uploads SET status = 'rejected' WHERE id = $1`;
        const result = await pool.query(query, [fileId]);

        if (result.rowCount === 0) {
            return res.status(404).send('File not found.');
        }

        res.send('File rejected successfully.');
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while rejecting the file.');
    }
});

// View All Pending Files (Admin Dashboard)
app.get('/pending', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM uploads WHERE status = 'pending'`);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while retrieving pending files.');
    }
});

// Serve Uploaded Files for Display
app.get('/uploads', (req, res) => {
    fs.readdir(path.join(__dirname, 'uploads'), (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan files.');
        }
        const fileList = files.map(file => ({
            name: file,
            url: `/uploads/${file}`
        }));
        res.json(fileList);
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
