var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');


var userSchema = mongoose.Schema({
	"name" : { type: String },
	"id" : { type: String },
	//"facebookID" : { type: String },
	//"instagramID" : { type: String },
	//"facebook_access_token" : { type: String },
	//"instagram_access_token" : { type: String }
	"access_token" : { type: String},
	"provider" : { type: String } 
});

userSchema.plugin(findOrCreate);

exports.User = mongoose.model('User', userSchema);

