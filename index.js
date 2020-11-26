/* Author: Christopher Haddox
Date: 11/25/2020
Description: Functional, locally-hosted message board (with logout feature and date/time!)
*/

import express from "express";
import exphbs from "express-handlebars";
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';

import sqlite3 from "sqlite3";
import { open } from "sqlite";

import { v4 as uuidv4 } from 'uuid';

export const dbPromise = open({
  filename: "data.db",
  driver: sqlite3.Database,
});

const grantAuthToken = async(userId) => {
    const db = await dbPromise;
    const tokenString = uuidv4();

    await db.run('INSERT INTO AccessTokens (token, userId) VALUES (?, ?);',
        tokenString, userId);
    
    return tokenString;
}

const lookupUserFromAccessToken = async(accessToken) => {
    const db = await dbPromise;
    
    const token = await db.get('SELECT * FROM AccessTokens WHERE token=?;', accessToken);

    if(!token) {
        return null;
    }

    const user = await db.get('SELECT id, email, username FROM Users WHERE id=?;', token.userId);

    return user;
}

const app = express();

app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");

app.use(cookieParser())
app.use(express.urlencoded({ extended: false }));
app.use('/static', express.static(__dirname + '/static'));

/*
        USER HANDLING
*/
app.use(async (req, res, next) => {
    const {accessToken} = req.cookies;

    if(!accessToken) {
        return next();
    }

    try {
        const user = await lookupUserFromAccessToken(accessToken);
        req.user = user;
    } catch (e) {
        return next({
            message: e,
            status: 500
        });
    }
    next();
})

/*
        HOME PAGE
*/

app.get("/", async (req, res) => {
    const db = await dbPromise;
    const posts = await db.all(`SELECT 
        Posts.id,
        Posts.postText,
        Posts.dateTime,
        Users.username as authorName
    FROM Posts LEFT JOIN Users WHERE Posts.authorId = Users.id`);
    console.log('messages', posts);

    res.render("home", {posts: posts, user: req.user})
})

/*
        REGISTER
*/

app.get("/register", (req, res) => {
    console.log("User entered register page")
    if(req.user) {
        return res.redirect("/")
    }
    res.render('register')
})

app.post("/register", async(req,res) => {
    const db = await dbPromise;
    const {
        username,
        email,
        password
    } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    try {
        await db.run('INSERT INTO Users (username, email, password) VALUES (?, ?, ?);',
            username,
            email,
            passwordHash
        )
        const user = await db.get('SELECT id FROM Users WHERE email=?;', email);
        const token = await grantAuthToken(user.id);
        res.cookie('accessToken', token);
        res.redirect('/');
    } catch (e) {
        return res.render('register', { error: e })
    }
})

/*
        LOGIN
*/

app.get("/login", (req, res) => {
    console.log("User entered login page")
    if(req.user) {
        return res.redirect("/")
    }
    res.render('login');
})

app.post("/login", async (req, res) => {
    const db = await dbPromise;

    const {
        username,
        password
    } = req.body;

    try {
        const existingUser = await db.get("SELECT * FROM Users WHERE username=?;", username);
        
        if(!existingUser) {
            throw 'Incorrect login. Please try again';
        }

        const samePass = await bcrypt.compare(password, existingUser.password);

        if(!samePass) {
            throw 'Incorrect login. Please try again';
        }

        const token = await grantAuthToken(existingUser.id);
        res.cookie('accessToken', token);
        res.redirect('/');
    } catch (e) {
        return res.render('login', {error: e})
    }
})

/*
        LOGOUT
*/

app.get("/logout", async (req, res) => {
    const db = await dbPromise;
    await db.run("DELETE FROM AccessTokens WHERE userId=?;", req.user.id);
  
    res.clearCookie("accessToken");
    res.redirect("/");
})

/*
        POSTING
*/

app.post("/post", async (req, res, next) => {
    if(req.user) {
        const db = await dbPromise;

        const date = new Date();
        await db.run('INSERT INTO Posts (postText, authorId, dateTime) VALUES (?, ?, ?);',
            req.body.postText, req.user.id, date.toLocaleString());

        res.redirect('/')
    }
    return next({
        status: 401,
        message: 'You must be logged in to post'
    })
})

app.use((err, req, res, next) => {
    res.status(err.status || 500)
    console.log(err);
    res.render('errorPage', {error: err.message || err})
})

/*
        SETUP
*/

const setup = async() => {
    const db = await dbPromise;
    await db.migrate();

    app.listen(8080, () => {
        console.log("listening on 8080")
    })
}

setup();