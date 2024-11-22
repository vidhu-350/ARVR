const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// Configure CORS with expanded options
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, Date.now() + '-' + sanitizedName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.gltf', '.glb'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only GLTF and GLB files are allowed.'));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// GET endpoint to list available models
app.get('/models', (req, res) => {
    const uploadDir = path.join(__dirname, 'uploads');
    
    try {
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }
        
        fs.readdir(uploadDir, (err, files) => {
            if (err) {
                console.error('Error reading directory:', err);
                return res.status(500).json({ success: false, message: 'Failed to read models directory' });
            }
            
            const modelFiles = files.filter(file => 
                ['.gltf', '.glb'].includes(path.extname(file).toLowerCase())
            );
            
            res.json(modelFiles);
        });
    } catch (error) {
        console.error('Error accessing models:', error);
        res.status(500).json({ success: false, message: 'Server error while accessing models' });
    }
});

// POST endpoint for model uploads
app.post('/uploads', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    res.json({
        success: true,
        message: 'File uploaded successfully',
        filename: req.file.filename
    });
});

// DELETE endpoint for model deletion
app.delete('/models/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(__dirname, 'uploads', filename);
        
        // Check if file exists
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ 
                success: false, 
                message: 'Model not found' 
            });
        }

        fs.unlinkSync(filepath);
        res.json({ 
            success: true, 
            message: 'Model deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete model' 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size is too large. Maximum size is 50MB'
            });
        }
    }
    res.status(500).json({
        success: false,
        message: err.message || 'Something went wrong!'
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});