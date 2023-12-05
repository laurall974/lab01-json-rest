'use strict';

var utils = require('../utils/writer.js');
var ImageService = require('../service/ImagesService.js');
var constants = require('../utils/constants.js');
/*** Upload an image file ***/

var multer = require('multer');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        try {
            const filmId = req.params.filmId; 
            const userId = req.user.id;

            if (!filmId || !userId) {
                throw new Error('Missing required information for filename');
            }
            cb(null, `${filmId}_${userId}_${file.originalname}`);
        } catch (error) {
            console.error(error);
            cb(error);
        }
    }
});

var upload = multer({ 
        storage: storage,
        fileFilter: function (req, file, cb) {
            const allowedFormats = ['image/jpeg', 'image/png', 'image/gif'];
            if (allowedFormats.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Invalid file format. Only JPEG, PNG, and GIF are allowed.'), false);
            }
        }
    })

module.exports.uploadImage = function uploadImage (req, res, next) {
    upload.single('image')(req, res, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ errors: [{ 'param': 'Server', 'msg': err.message }], });
        }
        const filmid = req.params.filmId;
        const userid = req.user.id;
        const format = req.file.mimetype; 
        const url = `/Users/llinareslaura/Desktop/Distributed System Programming/lab01-json-rest/REST\ APIs\ Implementation/uploads/${req.file.filename}`; 
    
        ImageService.uploadImage(url, userid, filmid, format)
            .then(function(response) {
                utils.writeJson(res, response, 201);
            })
            .catch(function(response) {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
            });
    });
    
};


module.exports.listAllImagesByFilmId = function listAllImagesByFilmId (req, res, next) {
    ImageService.listAllImagesByFilmId(req.params.filmId, req.user.id)
        .then(function(response) {
            utils.writeJson(res, response);
        })
        .catch(function(response) {
            if(response == 403){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner/reviewer of the film.' }], }, 403);
            }
            else if (response == 404){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film/image does not exist.' }], }, 404);
            }
            else {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
            }
        });

};


module.exports.getSingleImage = function getSingleImage (req, res, next) {
    ImageService.getSingleImage(req.params.filmId, req.user.id, req.params.imageId)
    .then(function(response) {
        utils.writeJson(res, response);
    })
    .catch(function(response) {
        if(response == 403){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner/reviewer of the film.' }], }, 403);
        }
        else if (response == 404){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The image does not exist.' }], }, 404);
        }
        else {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        }
    });

};

module.exports.deleteSingleImage = function deleteSingleImage (req, res, next) {

};


