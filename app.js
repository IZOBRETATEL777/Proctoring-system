var express = require('express');
var app = express();
var mysql = require('mysql2');
var bodyParser = require('body-parser');
var session = require('express-session');
var dotenv = require('dotenv').config();
var bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true, cookie: { secure: false, maxAge: 60000 } }));

var conn = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

conn.connect((err) => {
    if (err) throw err;
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.get('/login', function (req, res) {
    res.render('login', { errors: [] });
});

app.post('/login', body('email').isEmail(), body('password').isLength({ min: 5 }), function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('login', { errors: errors.array() });
    }
    else {
        var email = req.body.email;
        var password = req.body.password;
        var role = req.body.role;

        conn.query('SELECT * FROM ' + role + ' WHERE email = ?', [email], function (err, results, fields) {
            if (err) throw err;
            if (results.length > 0) {
                bcrypt.compare(password, results[0].password, function (err, result) {
                    if (result) {
                        req.session.loggedin = true;
                        req.session.user_id = results[0].id;
                        req.session.role = role;
                        if (role == 'student') {
                            res.redirect('/test');
                        }
                        else if (role == 'teacher') {
                            res.render('dashboard', { name: results[0].name });
                        }
                    }
                    else {
                        res.render('login', { errors: ['Incorrect email or password'] });
                    }
                });
            }
            else {
                res.render('login', { errors: ['Incorrect email or password'] });
            }
        });
    }
});

app.get('/register', function (req, res) {
    res.render('register', { errors: [] });
});

app.post('/register',
    body('email')
        .isEmail().withMessage('Invalid email'),
    body('name')
        .trim().isLength({ min: 1 }).withMessage('Name is required'),
    body('password').trim().escape()
        .isLength({ min: 8 }).withMessage('Name should be minimum 8 characters!'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation is incorrect');
        }
        return true;
    }),


    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).render('register', { errors: errors.array().map(error => error.msg) });
        }
        else {
            var name = req.body.name;
            var email = req.body.email;
            var password = req.body.password;
            bcrypt.hash(password, 10, function (err, hash) {
                if (err) throw err;
                conn.query('INSERT INTO teacher (name, email, password) VALUES (?, ?, ?)', [name, email, hash], function (err, results, fields) {
                    if (err) throw err;
                    res.render('login', {errors: ['Registered successfully']});
                });
            });
        }
    }
);

app.get('/add_student', function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        conn.query('SELECT * FROM `group`', function (err, results, fields) {
            if (err) throw err;
            res.render('add_student', { groups: results});
        });
    } else {
        res.sendStatus(403);
    }
});

app.post('/add_student', function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        var name = req.body.name;
        var email = req.body.email;
        var password = req.body.password;
        var group = req.body.group;
        bcrypt.hash(password, 10, function (err, hash) {
            if (err) throw err;
            conn.query('INSERT INTO student (name, email, password, group_id) VALUES (?, ?, ?, ?)', [name, email, hash, group], function (err, results, fields) {
                if (err) throw err;
                res.render('dashboard', { name: req.session.name });
            });
        });
    } else {
        res.sendStatus(403);
    }
});

app.get('/test', function (req, res) {
    if (req.session.loggedin && req.session.role == 'student') {
        conn.query('call get_latest_test(' + req.session.user_id + ')', function (err, results, fields) {
            if (err) throw err;
            conn.query('call get_questions_for_test(' + results[0][0].id + ')', function (err, questions, fields) {
                if (err) throw err;
                res.render('test', { test: results[0][0], questions: questions[0] });
            });
        });
    } else {
        res.sendStatus(403);
    }
});


app.get('/add_question', function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        res.render('add_question');
    } else {
        res.sendStatus(403);
    }
});

app.post('/add_question', function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        var question = req.body.question;
        var answer = req.body.answer;
        conn.query('INSERT INTO question (text, answer) VALUES (?, ?)', [question, answer], function (err, results, fields) {
            if (err) throw err;
            res.render('dashboard', { name: req.session.name });
        });
    } else {
        res.sendStatus(403);
    }
});


app.get('/question_list', function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        conn.query('SELECT * FROM question', function (err, results, fields) {
            if (err) throw err;
            conn.query('SELECT * FROM `group`', function (err, groups, fields) {
                if (err) throw err;
                res.render('question_list', { questions: results, groups: groups });
            }
            );
        });
    } else {
        res.sendStatus(403);
    }
});

app.post('/question_list', function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        console.log(req.body);
    } else {
        res.sendStatus(403);
    }
});


app.get('/logout', function (req, res) {
    req.session.destroy();
    res.send('<h1>Bye!</h1>');
});


app.listen(3000, function () {
    console.log('Listening on port 3000!');
}
);
