const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Default to index.html
    let filePath = req.url === '/' ? '/public/index.html' : req.url;
    
    // Append public directory for static files
    if (!filePath.startsWith('/src/')) {
        filePath = '/public' + filePath;
    }

    // Get the full path
    const fullPath = path.join(__dirname, filePath);

    // Get file extension
    const ext = path.extname(fullPath);

    // Set content type based on file extension
    const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.tsx': 'text/javascript',
    }[ext] || 'text/plain';

    // Read file
    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Page not found
                fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, content) => {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf8');
                });
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf8');
        }
    });
});

const PORT = 8000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
