var mongoose = require('mongoose');
var path = require('path');
var fs = require('fs');
var http = require('http');
var crypto = require('crypto');
var AWS = require('aws-sdk');
var Schema = mongoose.Schema;
var User = new Schema({
	email: String,
	image: String,
	hash: String
});
var User = mongoose.model('users', User);

exports.index = function(req, res){
	var success = req.query.success;
	var deleted = req.query.deleted;
	var message;
	if (success == 'true'){
		message = "You have successfully uploaded to Unicon! Thanks!";
	} else if (success == 'false') { //ensures message is empty when no query present
		message = "An error occurred.  Please make sure you upload an image file (.png, .jpg, .gif, .bmp)";
	}
	if (deleted == 'true'){
		message = "Your image has been removed from Unicon.";
	} else if (deleted == 'false') { //ensures message is empty when no query present
		message = "Could not locate an image for that email.";
	}
	res.render('index', { title: 'Unicon' , message: message});
};

exports.add = function(req, res){
	var email = req.body.email;
	var imageHash = crypto.createHash('md5').update(email).digest('hex');
	var tmpPath = req.files.image.path;
	var ext = path.extname(req.files.image.name).toLowerCase();
	var target = imageHash + ext;
	var isImage = false;
	switch (ext){
		case '.png':
		case '.jpg':
		case '.gif':
		case '.bmp':
			isImage = true;
			break;
		default:
			break;
	}

	if (isImage){
		//move from tmp to s3 if successful upload
		fs.readFile(tmpPath, function(err,data){
			var s3 = new AWS.S3();
			var params = {Bucket: 'unicon', Key: target, Body: data};
			s3.putObject(params, function(err, data){
				if (err) throw err;
				console.log("Image uploaded.");
			});
		});
		//update existing record or insert new one
		User.findOneAndUpdate({'email': email}, {'image': target, 'hash': imageHash}, {upsert: true}, function(){
			res.redirect('/?success=true');
		});
	} else {
		fs.unlink(tmpPath, function(){
			console.error("Incorrect file type (.png, .jpg, .gif, .bmp only)");
			res.redirect('/?success=false');
		});
	}
};

exports.remove = function(req, res){
	var email = req.body.email;
	//if doc exists, remove it - otherwise tell user does not exist
	User.findOneAndRemove({'email': email}, function(err, user){
		if (err) {
			console.error(err);
			res.redirect('/?deleted=false');
		} else {
			if (!user) {
				res.redirect('/?deleted=false');
				return;
			}
			var s3 = new AWS.S3();
			var params = {Bucket: 'unicon', Key: user.image};
			s3.deleteObject(params, function(err, data){
				if (err) {
					console.error(err);
					res.redirect('/?deleted=false');
				} else {
					res.redirect('/?deleted=true');
				}
			});
		}
	});
};

exports.image = function(req, res){
	var imageHash = req.params.key;
	//proxy the request to s3 server
	User.findOne({'hash': imageHash}, function(err, user){
		var imageURL = 'http://s3-us-west-2.amazonaws.com/unicon/' + user.image;
		http.get(imageURL, function(response){
			response.pipe(res);
		});
	});
};