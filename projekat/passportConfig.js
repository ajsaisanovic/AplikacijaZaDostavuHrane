const LocalStrategy = require("passport-local").Strategy;
var pg=require('pg');
var config = {
    user: 'postgres', //env var: PGUSER
    database: 'postgres', //env var: PGDATABASE
    password: 'ajsabaza', //env var: PGPASSWORD
    host: 'localhost', // Server hosting the postgres database
    port: 5432, //env var: PGPORT
    max: 100, // max number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
};
var pool = new pg.Pool(config);
const bcrypt = require("bcrypt");

function initialize(passport) {

    const authenticateUser = (email, password, done) => {
        console.log(email, password);
        pool.query(
            `SELECT * FROM korisnici WHERE email = $1`,
            [email],
            (err, results) => {
                if (err) {
                    throw err;
                }
                console.log(results.rows);

                if (results.rows.length > 0) {
                    const user = results.rows[0];

                    bcrypt.compare(password, user.pasvord, (err, isMatch) => {
                        if (err) {
                            console.log(err);
                        }
                        if (isMatch) {
                            return done(null, user);
                        } else {
                            //password is incorrect
                            return done(null, false, { message: "Password is incorrect" });
                        }
                    });
                } else {
                    // No user
                    return done(null, false, {
                        message: "No user with that email address"
                    });
                }
            }
        );
    };

    passport.use(
        new LocalStrategy(
            { usernameField: "email", passwordField: "password" },
            authenticateUser
        )
    );

    passport.serializeUser((user, done) => done(null, user.id));

    passport.deserializeUser((id, done) => {
        pool.query(`SELECT * FROM korisnici WHERE id = $1`, [id], (err, results) => {
            if (err) {
                return done(err);
            }
            console.log(`ID is ${results.rows[0].id}`);
            return done(null, results.rows[0]);
        });
    });

}
module.exports = initialize;