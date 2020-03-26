const fs = require('fs');
const path = require('path');

function deliverHTTP(req,res){
    //res.sendFile(path.join(__dirname + '/html/index.html'));
    var root = './src/html/';
    var url = req.url;
    
    //check if a file was asked for
    if(url.substr(url.length - 5).indexOf(".") === -1){ //not a file
        url = "index.html";
    }
    
    // set asset path
    var assetPath = path.join(root, url);

    // define content type
    var contentType = "application/octet-stream"
    
    if(path.extname(assetPath) === ".html" || path.extname(assetPath) === ".htm") {
        contentType = 'text/html';
    } else if (path.extname(assetPath) === ".js") {
        contentType = 'text/javascript';
    } else if (path.extname(assetPath) === ".css") {
        contentType = 'text/css';
    } else if (path.extname(assetPath) === ".ico") {
        contentType = 'image/x-icon';
    } else if (path.extname(assetPath) === ".svg") {
        contentType = 'image/svg+xml';
    }
    
    // try to deliver asset
    if(fs.existsSync(assetPath)) {
        fs.readFile(assetPath, (err, data) => {
            if (err) throw err;
            res.set('Content-Type', contentType)
            res.status(200).send(data);
        });
        
    } 
    
    //asset not found: 404
    else {
        assetPath = path.join(root, "content/404.html");
        fs.readFile(assetPath, (err, data) => {
            if (err) throw err;
            res.set('Content-Type', contentType)
            res.status(404).send(data);

        });
    }
}

exports.deliver = function(req, res){
    deliverHTTP(req,res);
}