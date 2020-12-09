const User = require('../models/user');
const jwt = require('jsonwebtoken'); //use to generate signed token
const expressJwt = require('express-jwt'); // use for authorization check
const { errorHandler } = require('../helpers/dbErrorHandler');

exports.signup = async (req, res) => {
   try{    
        const user = await new User( req.body );

        await user.save((error, user) => {       
            if(error) {
                return res.status(400).json({
                    err: 'Fields cannot be empty'
                });
            }
            user.salt = undefined;
            user.hashed_password = undefined;
            res.status(200).json({
                user
            });
        });
    } catch(err){
        console.error(err.message);
    }
};

exports.signin = (req, res) => {
    // find user based on email
    const { email, password } = req.body;
    User.findOne({ email }, (err, user) => {
        if (err || !user){
            return res.status(400).json({
                error: "User with that email does not exist. Please sign up"
            });
        }

        // if user is found, make sure the email and password match
        // create authenticate method in the user model
        if(!user.authenticate(password)){
            return res.status(401).json({
                error: 'Email and password do not match'
            });
        }
        // generate a signed token with user id and secret
        const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET);
        //persist the token as 't  in cookie with expiry date
        res.cookie('t', token, {expire: new Date() + 9999});
        //return response with user and token to the front end client
        const {_id, name, email, role } = user
        return res.json({token, user: {_id, email, name, role}})
    });
};

exports.signout = (req, res) => {
    res.clearCookie("t");
    res.json({ message: "Signout successful"})
};

exports.requireSignin = expressJwt({
    secret: process.env.JWT_SECRET,
    userProperty: "auth"
})

exports.isAuth = (req, res, next ) => {
    let user = req.profile && req.auth && req.profile._id == req.auth._id
    
    if(!user){
        return res.status(403).json({
            error: "Access denied"
        });
    }
    next();
}

exports.isAdmin = (req, res, next) => {
    if(req.profile.role === 0){
        return res.status(403).json({
            error: "Admin resource! Access denied"
        });
    }
    next()
}