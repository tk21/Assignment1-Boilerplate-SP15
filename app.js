//dependencies for each module used
var express = require('express');
var passport = require('passport');
var InstagramStrategy = require('passport-instagram').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var http = require('http');
var path = require('path');
var handlebars = require('express-handlebars');
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var dotenv = require('dotenv');
var Instagram = require('instagram-node-lib');
var Facebook = require('fbgraph');
var mongoose = require('mongoose');
var app = express();

//local dependencies
var models = require('./models');

//client id and client secret here, taken from .env
dotenv.load();
var INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
var INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
var INSTAGRAM_CALLBACK_URL = process.env.INSTAGRAM_CALLBACK_URL;
var FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
var FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
var FACEBOOK_CALLBACK_URL = process.env.FACEBOOK_CALLBACK_URL;
var INSTAGRAM_ACCESS_TOKEN = "";
Instagram.set('client_id', INSTAGRAM_CLIENT_ID);
Instagram.set('client_secret', INSTAGRAM_CLIENT_SECRET);

//connect to database
mongoose.connect(process.env.MONGODB_CONNECTION_URL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log("Database connected succesfully.");
});

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into ablend deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Instagram profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the InstagramStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Instagram
//   profile), and invoke a callback with a user object.
passport.use(new InstagramStrategy({
    clientID: INSTAGRAM_CLIENT_ID,
    clientSecret: INSTAGRAM_CLIENT_SECRET,
    callbackURL: INSTAGRAM_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    models.User.findOrCreate({
      "name": profile.displayName,
      "id": profile.id,
      "access_token": accessToken,
      "provider" : profile.provider
    }, function(err, user, created) {
      
      // created will be true here
      models.User.findOrCreate({}, function(err, user, created) {
        // created will be false here
        process.nextTick(function () {
          // To keep the example simple, the user's Instagram profile is returned to
          // represent the logged-in user.  In a typical application, you would want
          // to associate the Instagram account with a user record in your database,
          // and return that user instead.
          return done(null, profile);
        });
      })
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: FACEBOOK_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    models.User.findOrCreate({
      "name": profile.displayName,
      "id": profile.id,
      "access_token": accessToken ,
      "provider" : profile.provider
    }, function(err, user, created) {
      
      // created will be true here
      models.User.findOrCreate({}, function(err, user, created) {
        // created will be false here
        process.nextTick(function () {
          // To keep the example simple, the user's Instagram profile is returned to
          // represent the logged-in user.  In a typical application, you would want
          // to associate the Instagram account with a user record in your database,
          // and return that user instead.
          Facebook.setAccessToken( accessToken );
          return done(null, profile);
        });
      })
    });
  }
));

//Configures the Template engine
app.engine('handlebars', handlebars({defaultLayout: 'layout'}));
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({ secret: 'keyboard cat',
                  saveUninitialized: true,
                  resave: true}));
app.use(passport.initialize());
app.use(passport.session());

//set environment ports and start application
app.set('port', process.env.PORT || 3000);

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { 

    return next(); 
  }
  res.redirect('/login');
}

/*function ensureAuthenticatedInstagram(req, res, next) {
  if (req.isAuthenticated() || req.user.instagramID) { 

    return next(); 
  }
  res.redirect('/login');
}

function ensureAuthenticatedFacebook(req, res, next) {
  if (req.isAuthenticated() || req.user.facebookID) { 
    return next(); 
  }
  res.redirect('/login');
}*/

//routes
app.get('/', function(req, res){
  res.render('login');
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

/*app.get('/instagramAccount', ensureAuthenticatedInstagram, function(req, res){
  res.render('instagramAccount', {user: req.user});
});*/

app.get('/instagramAccount', ensureAuthenticated, function(req, res){
  //console.log(req.user);
  var query  = models.User.where({ name: req.user.username });
  query.findOne(function (err, user) {

    if (err) return handleError(err);

    if (req.user.provider == 'instagram') {
      console.log("instagram!");

      // doc may be null if no document matched
      Instagram.users.self({
        access_token: user.access_token,
        complete: function(data) {
          //Map will iterate through the returned data obj
          var imageArr = data.map(function(item) {
            //create temporary json object
            tempJSON = {};
            tempJSON.url = item.images.low_resolution.url;
            tempJSON.caption = item.caption.text;
            tempJSON.postedby = item.user.username;
            //insert json object into image array
            return tempJSON;
          });
          res.render('instagramAccount', {photos: imageArr, name: user.name, user: req.user});
          
        }
      });

    /**  Instagram.users.self({
        access_token: user.access_token,
        complete: function(data) {
          //Map will iterate through the returned data obj
         // var acct = data.map(function(item) {
            //create temporary json object
            console.log(data.id.text);
            tempJSON = {};
           // tempJSON.url = item.images.low_resolution.url;
            //tempJSON.prof_pic = data.profile_picture;
            //console.log(tempJSON.prof_pic);
            //insert json object into image array
            return tempJSON;
          //});
          res.render('instagramAccount', {photos: imageArr, name: user.name, user: req.user});

        }
      }); **/
    }

    else if(req.user.provider == 'facebook') {
      console.log("facebook!");
      Facebook.get('/' + user.id + '/photos?type=tagged', function(err, response) {
      response.paging.limit = 10;
      var imageArr = response.data.map(function(item) {
        item.width = 5;
        var tempJSON = {};
        tempJSON.url = item.source;
        tempJSON.caption = item.name;
        return tempJSON;
        });
        res.render('instagramAccount', {photos: imageArr, user: req.user});
      });
    }
    else
      console.log("This shouldn't be happening!");
  });
});


// GET /auth/instagram
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Instagram authentication will involve
//   redirecting the user to instagram.com.  After authorization, Instagram
//   will redirect the user back to this application at /auth/instagram/callback
app.get('/auth/instagram',
  passport.authenticate('instagram'),
  function(req, res){
    // The request will be redirected to Instagram for authentication, so this
    // function will not be called.
  });

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['public_profile','user_photos', 'read_stream'], failureRedirect: '/login'}),
    function(req, res) {
  // we don't have a code yet
  // so we'll redirect to the oauth dialog
  /*if (!req.query.code) {
    var authUrl = Facebook.getOauthUrl({
        "client_id":     FACEBOOK_APP_ID
      , "redirect_uri":  FACEBOOK_CALLBACK_URL
    });

    if (!req.query.error) { //checks whether a user denied the app facebook login/permissions
      res.redirect(authUrl);
    } else {  //req.query.error == 'access_denied'
      res.send('access denied');
    }
    return;
  }
    Facebook.authorize({
      "client_id":      FACEBOOK_APP_ID
    , "redirect_uri":   FACEBOOK_CALLBACK_URL
    , "client_secret":  FACEBOOK_APP_SECRET
    , "code":           req.query.code
  }, function (err, facebookRes) {
    res.redirect('/photos');
  });*/

});

app.get('/instagramAccount', function(req, res) {
  res.render('instagramAccount', { title: "Logged In" });
});

app.get('/facebookAccount', function(req, res) {
  res.render('facebookAccount', { title: "Logged In" });
});

// GET /auth/instagram/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/instagram/callback', 
  passport.authenticate('instagram', { failureRedirect: '/login'}),
  function(req, res) {
    res.redirect('/instagramAccount');
  });

app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login'}),
  function(req, res) {
    res.redirect('/photos');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});


app.post('/login', passport.authenticate('local', { successRedirect: '/',
                                                    failureRedirect: '/login'}));