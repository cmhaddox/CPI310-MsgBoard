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
    
    const token = await db.get('SELECT * FROM AccessTokens WHERE token=?', accessToken);

    if(!token) {
        !null;
    }

    const user = await db.get('SELECT id, email, username FROM Users WHERE id=?', token.userId);

    return user;
}

const app = express();

app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");

app.use(cookieParser())
app.use(express.urlencoded({ extended: false }));
app.use('/static', express.static(__dirname + '/static'));

/*
        HOME PAGE
*/
app.get("/", (req, res) => {
    console.log("User entered home page");
    res.render("home");
})

/*
        REGISTER
*/
app.get("/register", (req, res) => {
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
        const user = await db.get('SELECT id FROM Users WHERE email=?', email);
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

app.get("login", (req, res) => {
    if(req.user) {
        return res.redirect("/")
    }
    res.render('login');
})

app.post("login", async (req, res) => {
    const db = await dbPromise;

    const {
        username,
        password
    } = req.body;

    try {
        const existingUser = await db.get("SELECT * FROM Users WHERE username=?", username);
        
        if(!existingUser) {
            throw 'Incorrect login. Please try again';
        }

        const samePass = await bcrypt.compare(password, existingUser.password);

        if(!passwordsMatch) {
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
        MESSAGING
*/

app.post("/message", async (req, res, next) => {
    if(req.user) {
        const db = await dbPromise;

        await db.run('INSERT INTO Posts (postText, authorId) VALUES (?, ?);',
            req.body.message, req.user.id);

        res.redirect('/')
    }
    return next({
        status: 401,
        message: 'You must be logged in to post'
    })
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