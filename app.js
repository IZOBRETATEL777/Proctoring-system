var express = require('express');
var app = express();
var mysql = require('mysql2');
var bodyParser = require('body-parser');
var session = require('express-session');
var dotenv = require('dotenv').config();
var bcrypt = require('bcrypt');
var moment = require('moment');
const { body, validationResult } = require('express-validator');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true, cookie: { secure: false, maxAge: 60 * 60 * 1000 } }));

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
    res.render('index');
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
                    res.render('login', { errors: ['Registered successfully'] });
                });
            });
        }
    }
);

app.get('/dashboard', function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        res.render('dashboard', { name: req.session.name });
    }
    else {
        res.redirect('/login');
    }
});

app.get('/test', function (req, res) {
    if (req.session.loggedin && req.session.role == 'student') {
        conn.query('call get_latest_test(?)', [req.session.user_id], function (err, results, fields) {
            if (err) throw err;
            conn.query('SELECT * FROM test_student WHERE test_id = ? AND student_id = ?', [results[0][0].id, req.session.user_id], function (err, results2, fields) {
                if (err) throw err;
                if (results2.length > 0) {
                    res.redirect('/student_profile');
                }
                else {
                    conn.query('call get_questions_for_test(?)', [results[0][0].id], function (err, questions, fields) {
                        if (err) throw err;
                        res.render('test', { test: results[0][0], questions: questions[0] });
                    });
                }
            });
        });
        } else {
            res.redirect('/login');
        }
});

app.post('/test', function (req, res) {
    if (req.session.loggedin && req.session.role == 'student') {
        var answers = req.body.answers;
        var test_id = req.body.test_id;
        var student_id = req.session.user_id;
        conn.query('call get_questions_for_test(' + test_id + ')', function (err, questions, fields) {
            if (err) throw err;
            var correct_answers = 0;
            for (var i = 0; i < questions[0].length; i++) {
                if (questions[0][i].answer == answers[i]) {
                    correct_answers++;
                }
            }
            var result = (correct_answers / questions[0].length) * 100;
            conn.query('INSERT INTO test_student (test_id, student_id, result) VALUES (?, ?, ?)', [test_id, student_id, result], function (err, results, fields) {
                if (err) throw err;
                res.render('test_results', { correct_answers: correct_answers, total_questions: questions[0].length });
            });
        });
    } else {
        res.redirect('/login');
    }
});


app.get('/add_question', function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        res.render('add_question');
    } else {
        res.redirect('/login');
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
        res.redirect('/login');
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
        res.redirect('/login');
    }
});

app.post('/question_list', function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        var questions = req.body.questions;
        if (typeof (questions) != 'array') {
            questions = [questions];
        }
        var testName = req.body.test_name;
        var group = req.body.group;
        var teacherId = req.session.user_id;
        var startTime = req.body.start_time;
        var endTime = req.body.end_time;

        conn.query('INSERT INTO test (name, group_id, teacher_id, start_time, end_time) VALUES (?, ?, ?, ?, ?)', [testName, group, teacherId, startTime, endTime], function (err, results, fields) {
            if (err) throw err;
            var testId = results.insertId;
            for (var i = 0; i < questions[0].length; i++) {
                if (questions[0][i] != null) {
                    conn.query('INSERT INTO test_question (test_id, question_id) VALUES (?, ?)', [testId, questions[0][i]], function (err, results, fields) {
                        if (err) throw err;
                    });
                }
            }
            res.render('dashboard', { name: req.session.name });
        });
    } else {
        res.redirect('/login');
    }
});


app.get('/student_rating', function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        conn.query('call get_the_best_n_students_in_grup(?)', [10], function (err, results, fields) {
            if (err) throw err;
            res.render('student_rating', { students: results });
        });
    } else {
        res.redirect('/login');
    }
});


app.post('/student_rating', function (req, res) {
    var number_of_students = req.body.number_of_students;
    if (req.session.loggedin && req.session.role == 'teacher') {
        conn.query('call get_the_best_n_students_in_grup(?)', [number_of_students], function (err, results, fields) {
            if (err) throw err;
            res.render('student_rating', { students: results });
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/student_edit', function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        conn.query('SELECT * FROM student', function (err, results, fields) {
            if (err) throw err;
            conn.query('SELECT * FROM `group`', function (err, groups, fields) {
                if (err) throw err;
                res.render('student_edit', { students: results, groups: groups });
            });
        });
    } else {
        res.redirect('/login');
    }
});

app.post('/student_edit', function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        var id = req.body.id;
        var name = req.body.name;
        var email = req.body.email;
        var group = req.body.group;
        var password = req.body.password;
        var action = req.body.action;

        if (action == 'delete') {
            conn.query('DELETE FROM student WHERE id = ?', [id], function (err, results, fields) {
                if (err) throw err;
                conn.query('SELECT * FROM student', function (err, results, fields) {
                    if (err) throw err;
                    conn.query('SELECT * FROM `group`', function (err, groups, fields) {
                        if (err) throw err;
                        res.render('student_edit', { students: results, groups: groups });
                    });
                });
            });
        } else if (action == 'update') {
            conn.query('UPDATE student SET name = ?, email = ?, group_id = ? WHERE id = ?', [name, email, group, id], function (err, results, fields) {
                if (err) throw err;
                conn.query('SELECT * FROM student', function (err, results, fields) {
                    if (err) throw err;
                    conn.query('SELECT * FROM `group`', function (err, groups, fields) {
                        if (err) throw err;
                        res.render('student_edit', { students: results, groups: groups });
                    });
                });
            });
        } else if (action == 'create') {
            bcrypt.hash(password, 10, function (err, hash) {
                conn.query('INSERT INTO student (name, email, group_id, password) VALUES (?, ?, ?, ?)', [name, email, group, hash], function (err, results, fields) {
                    if (err) throw err;
                    conn.query('SELECT * FROM student', function (err, results, fields) {
                        if (err) throw err;
                        conn.query('SELECT * FROM `group`', function (err, groups, fields) {
                            if (err) throw err;
                            res.render('student_edit', { students: results, groups: groups });
                        });
                    });
                });
            });
        }

    } else {
        res.redirect('/login');
    }
});

app.get('/logout', function (req, res) {
    req.session.destroy();
    res.render('index');
});

app.get("/group_edit", function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        conn.query('SELECT * FROM `group`', function (err, results, fields) {
            if (err) throw err;
            res.render('group_edit', { groups: results });
        });
    } else {
        res.redirect('/login');
    }
});

app.post("/group_edit", function (req, res) {
    if (req.session.loggedin && req.session.role == 'teacher') {
        var group_id = req.body.id;
        var group_name = req.body.name;
        var action = req.body.action;
        if (action == 'delete') {
            conn.query('DELETE FROM `group` WHERE id = ?', [group_id], function (err, results, fields) {
                if (err) throw err;
            });
        } else if (action == 'update') {
            conn.query('UPDATE `group` SET name = ? WHERE id = ?', [group_name, group_id], function (err, results, fields) {
                if (err) throw err;
            });
        } else if (action == 'create') {
            conn.query('INSERT INTO `group` (name) VALUES (?)', [group_name], function (err, results, fields) {
                if (err) throw err;
            });
        }
        conn.query('SELECT * FROM `group`', function (err, results, fields) {
            if (err) throw err;
            res.render('group_edit', { groups: results });
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/student_profile', function (req, res) {
    if (req.session.loggedin && req.session.role == 'student') {
        conn.query('SELECT * FROM student WHERE id = ?', [req.session.user_id], function (err, student, fields) {
            if (err) throw err;
            conn.query('SELECT * FROM `group` WHERE id = ?', [student[0].group_id], function (err, group, fields) {
                if (err) throw err;
                conn.query('SELECT * FROM test_student WHERE student_id = ?', [req.session.user_id], function (err, results, fields) {
                    if (err) throw err;
                    conn.query('call get_achievements_for_student(?)', [req.session.user_id], function (err, achievements, fields) {
                        if (err) throw err;
                        res.render('student_profile', { student: student[0], group: group[0].name, results: results, achievements: achievements[0] });
                    });
                });
            });
        });
    } else {
        res.redirect('/login');
    }
});


app.listen(3000, function () {
    console.log('Listening on port 3000!');
}
);
