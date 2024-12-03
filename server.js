const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads'); // Save files in 'uploads' folder
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + file.originalname;
        cb(null, uniqueSuffix);
    }
});

const upload = multer({ storage });

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const fileUrl = `/uploads/${req.file.filename}`; // URL to access the uploaded file
    res.send(`
        <h2>File uploaded successfully!</h2>
        <p><strong>View File:</strong> <a href="${fileUrl}" target="_blank">${fileUrl}</a></p>
        <p><strong>Download File:</strong> <a href="${fileUrl}" download>Download</a></p>
        <a href="/">Go Back</a>
    `);
});

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


// Start the server
app.listen(PORT,'0.0.0.0',() => {
    console.log(`Server running at http://localhost:${PORT}`);
});
