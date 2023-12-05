class Image{    
    constructor(imageId,url, filmId, uploaderId, format ) {
        this.imageId = imageId
        this.url = url;
        this.uploaderId = uploaderId;
        this.filmId = filmId
        this.format = format
        
        var selfLink = "/api/films/public/" + this.filmId + "/images/" + this.imageId;
        this.self =  selfLink;

    }
}

module.exports = Image;


