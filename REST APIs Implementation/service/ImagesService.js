'use strict';

const Image = require('../components/image');
const User = require('../components/user');
const db = require('../components/db');
var constants = require('../utils/constants.js');

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
 exports.getSingleImage = function(filmId, userId, imageId, accept) {
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
            console.log('Query Result:', rows); 
            let image = rows.map((row) => createImage(row));
            resolve(image);
        }
        else
          reject(403);
    });
});
}



/**

 **/
 exports.deleteSingleImage = function() {
   
    
}


/**
 * Utility functions
 */
 const getPagination = function(req) {
  var pageNo = parseInt(req.query.pageNo);
  var size = parseInt(constants.OFFSET);
  var limits = [];
  limits.push(req.params.filmId);
  limits.push(req.params.filmId);
  if (req.query.pageNo == null) {
      pageNo = 1;
  }
  limits.push(size * (pageNo - 1));
  limits.push(size);
  return limits;
}

const createImage = function(row) {
  return new Image(row.imageId, row.url, row.filmId, row.uploaderId, row.format);
}
