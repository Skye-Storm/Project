const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

// database configuration
const dbConfig = {
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

app.set('view engine', 'ejs');
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    resave: true,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

const user = {
  username: undefined
};

app.listen(3000);
console.log('Server is listening on port 3000');

app.get('/', (req, res) =>{
  res.redirect('/login'); 
});

app.get('/login', (req, res) =>{
  if (req.session.user) {
    return res.redirect("/courses");
  } else {
    res.render('pages/login'); 
  }
});

// Login submission
app.post('/login', async (req, res) =>{
  const username = req.body.username;
  const query = "SELECT * FROM users WHERE users.username = $1";
  const values = [username];
  
  // check that user entered valid username password
  const user = await db.oneOrNone(query, values);
  if (user) {
    const valid = await bcrypt.compare(req.body.password, user.password);
    if (valid) {
      req.session.user = user;
      res.redirect('/courses');
    } else {
      res.render('pages/login', {
        error: 'Invalid username or password',
      });
    }
  }
  else {
    res.render('pages/login', {
      error: 'Invalid username or password',
    });
  }

});

// Registration
app.get('/register', (req, res) => {
  res.render('pages/register',{});
});

app.post('/register', async (req, res) => {
const user = req.body.username;
const hash = await bcrypt.hash(req.body.password, 10);
const query = "INSERT INTO users (username, password) VALUES ($1, $2);"
db.any (query, [user, hash])
  .then((data) => {
     user.username = data.user;
     hash.password = data.password;
     res.redirect("/login");
   })
   .catch((err) => {
      console.log(err);
      res.redirect("/register");
    });
});

// Authentication middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

app.use(auth);

// Courses Page Stuff
app.get("/", (req, res) => {
  res.render("pages/courses", {
    username: req.session.user.username,
  });
});

app.get("/courses", (req, res) => {
  // get courses that are taken from the courses table using the user_courses table 
  // use course_id and course_prefix to get the course name from the courses table
  const taken_courses = "SELECT * FROM courses WHERE (course_id, course_prefix) IN (SELECT course_id, course_prefix FROM user_courses WHERE username = $1);";
  const all_courses = "SELECT * FROM courses";

  db.any(taken_courses, [req.session.user.username])
    .then((courses) => {
      console.log(courses);
      res.render("pages/courses", {
        courses,
        username: req.session.user.username,
      });
    })
    .catch((err) => {
      res.render("pages/login", {
        error: true,
        message: err.message,
      });
      console.log(err);
    });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});