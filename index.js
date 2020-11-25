import express from "express";
import exphbs from "express-handlebars";
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';

import sqlite3 from "sqlite3";
import { open } from "sqlite";

//import { grantAuthToken, lookupUserFromAuthToken } from "./auth";

export const dbPromise = open({
  filename: "data.db",
  driver: sqlite3.Database,
});

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