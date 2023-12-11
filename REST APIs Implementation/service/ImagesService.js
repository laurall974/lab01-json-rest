'use strict';

const Image = require('../components/image');
const User = require('../components/user');
const db = require('../components/db');
var path = require('path');
var fs = require('fs');


/**  Configure gRPC **/
const PROTO_PATH = __dirname + '/proto/conversion.proto'; 
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
let packageDefinition = protoLoader.loadSync( PROTO_PATH,
            {keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true}
        );
let protoD = grpc.loadPackageDefinition(packageDefinition);  //proto file descriptor
let converter = protoD.conversion; // namespace containing stub constructors
const client = new converter.Converter('localhost:50051', grpc.credentials.createInsecure());


/**
 * Upload an image to a public film 
 *
 * Input: 
 * - url: path of the image in the local server
 * - userid: ID of the user who is upload the image
 * - filmid : ID of the film the image is associated to 
 * - format : format of the image (should be png, jpeg or gif)
 * Output:
 * - the created image 
 **/
 exports.uploadImage = function(url, userid, filmid, format) {
  return new Promise((resolve, reject) => {
    const sql1 = "SELECT owner, private FROM films f WHERE f.id = ?";
    db.all(sql1, [filmid], (err, rows) => {
        if (err)
            reject(err);
        else if (rows.length === 0)
            reject(404);
        else if (rows[0].private === false)
            reject(409)
        else if(userid != rows[0].owner) {
            reject(403);
        }
        else {
          const sql2 = 'INSERT INTO images(url, uploaderId, filmId, format) VALUES(?,?,?,?)';
          db.run(sql2, [url, userid, filmid, format], function(err) {
              if (err) {
                  console.error(err)
                  reject(err);
              } else {
                  const imageId = this.lastID; 
                  var addedImage = new Image(imageId, url, filmid, userid, format);
                  resolve(addedImage);
              }
          });
        }
    });
});

}



/**
 * A user can retrieve the list of all the images associated to a public film she owns, or she is a reviewer of.
 *
 * Input: 
 * - userid: ID of the user who is upload the image
 * - filmid : ID of the film the image is associated to 
 * Output:
 * - the list of all images
 **/
 exports.listAllImagesByFilmId = function(filmId, userId) {
  return new Promise((resolve, reject) => {
    const sql1 = "SELECT DISTINCT imageId, url, uploaderId, images.filmId, format, reviewerId FROM images JOIN reviews ON images.filmId = reviews.filmId WHERE images.filmId = ? AND reviewerId != images.uploaderId";
    db.all(sql1, [filmId], (err, rows) => {
        if (err)
            {console.log(err);
            reject(err);}
        else if (rows.length === 0)
            reject(404);
        else if (rows[0].private === false)    
            reject(404);
        else if (rows[0].uploaderId == userId || rows[0].reviewerId == userId){
            console.log('Query Result:', rows); 
            let images = rows.map((row) => createImage(row));
            resolve(images);
        }
        else
          reject(403);
    });
});
}


/**
 * A user can retrieve each single image associated to a public film she owns, or she is a reviewer of.
 * 
 * Input: 
 * - userid: ID of the user who is upload the image
 * - filmid : ID of the film the image is associated to 
 * Output:
 * - the list of all images
 **/
 exports.getSingleImage = function(userId, filmId, imageId, format) {
  return new Promise((resolve, reject) => {
    const sql1 = "SELECT imageId, url, uploaderId, images.filmId, format, reviewerId FROM images JOIN reviews ON images.filmId = reviews.filmId WHERE images.filmId = ? AND images.imageId = ? AND reviewerId != images.uploaderId";
    db.all(sql1, [filmId, imageId], (err, rows) => {
        if (err)
            {console.log(err);
            reject(err);}
        else if (rows.length === 0)
            reject(404);
        else if (rows[0].private === false)    
            reject(404);
        else if (rows[0].uploaderId == userId || rows[0].reviewerId == userId){
            let image = rows.map((row) => createImage(row));
            const [, imageFormat] = image[0].format.split('/');

            console.log(image)
            // i retrieve image information in json format
            if (format === "json") 
                { resolve (image); }
            // i want to download the image with a specific media type 
            else { 
                try {
                    if (fs.existsSync(image[0].url)) {
                        const fileInfo = path.parse(image[0].url);
                        if (imageFormat === format){
                            console.log(image[0].url)
                            resolve(image[0].url);
                        }
                        else {
                            var pathFile2 = './uploads/' + fileInfo.name + '.' + format;
                            console.log(imageFormat, format)
                            convertImage(image[0].url, pathFile2, imageFormat, format);
                            resolve('uploads/' + fileInfo.name + '.' + format);
                            }
        
                        }
                }
                catch (error) {
                    reject(error)
    
                }
            }
            }
        });
    });
}

// async function convertImage (pathOriginFile, pathTargetFile, originType, targetFormat) {
//         const fileContent = fs.readFileSync(pathOriginFile);

//         // open the gRPC call with the gRPC server
//         const call = client.fileConvert((error, response) => {
//             if (error) {
//                 console.error(error);
//                 callback(error, null);
//             } 
//             else {
//                 console.log(response);
//                 callback(null, response);
//             }
//         });

//         // Send metadata (file type information)
//         call.write({
//             "meta": {
//             "fileTypeOrigin": originType,
//             "fileTypeTarget": targetFormat,
//             },
//         });

//         // Send the file content to the server
//         call.write({ file: fileContent });
// send it into chunks

//         // Close the request stream
//         call.end();
    
// }

/** From correction  */
function convertImage(pathOriginFile, pathTargetFile, originType, targetType) {

    return new Promise((resolve, reject) => {
    
        // Open the gRPC call with the gRPC server
        let call = client.fileConvert();


        // Set callback to receive back the file
        var wstream = fs.createWriteStream(pathTargetFile); //for now, the name is predefined
        var success = false;
        var error = "";
        call.on('data', function(data){

            //receive meta data
            if(data.meta != undefined){
                success = data.meta.success;
                
                if(success == false){
                    error = data.meta.error;
                    reject(error);
                }
            }

            //receive file chunck
            if(data.file != undefined){
                wstream.write(data.file);
            }

        });

        // Set callback to end the communication and close the write stream 
        call.on('end',function(){
            wstream.end();
        })
                    
        // Send the conversion types for the file (when the gRPC client is integrated with the server of Lab01, the file_type_origin and file_type_target will be chosen by the user)
        call.write({ "meta": {"file_type_origin": originType, "file_type_target": targetType}});

        // Send the file
        const max_chunk_size = 1024; //1KB
        const imageDataStream = fs.createReadStream(pathOriginFile, {highWaterMark: max_chunk_size});
       
        imageDataStream.on('data', (chunk) => {
            call.write({"file": chunk });
        });

        // When all the chunks of the image have been sent, the clients stops to use the gRPC call from the sender side
        imageDataStream.on('end', () => {
            call.end();
        });

        // Only after the write stream is closed,the promise is resolved (otherwise race conditions might happen)
        wstream.on('close',function(){
            resolve();
        })
    });

}


/**

 **/
 exports.deleteSingleImage = function(owner, imageId) {
    return new Promise((resolve, reject) => {
        const sql1 = "SELECT * FROM images i WHERE i.imageId = ? ";
        db.all(sql1, [imageId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else if(owner != rows[0].uploaderId) {
                reject(403);
            }
            else {
                const sql3 = 'DELETE FROM images WHERE imageId = ?';
                db.run(sql3, [imageId], (err) => {
                    if (err)
                         reject(err);
                     else
                        resolve(null);
                })
                if (fs.existsSync(rows[0].url)){
                    fs.unlinkSync(rows[0].url);
                    console.log("Delete File successfully.");
                }
            }
        });
    });
   
    
}



const createImage = function(row) {
  return new Image(row.imageId, row.url, row.filmId, row.uploaderId, row.format);
}
