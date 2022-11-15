const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

const taken_courses = "SELECT * FROM courses INNER JOIN user_courses ON user_courses.course_id = courses.course_id WHERE (courses.course_id, courses.course_prefix) IN (SELECT user_courses.course_id, user_courses.course_prefix FROM user_courses WHERE user_courses.username = $1);";
const not_taken_courses = "SELECT * FROM courses WHERE (course_id, course_prefix) NOT IN (SELECT course_id, course_prefix FROM user_courses WHERE username = $1);";
const all_courses = "SELECT * FROM courses";
// should join user_courses and courses based upon taken courses. The join allows current_gpa.ejs to then update grade_complete and quality_points
const letter_grades = "SELECT * FROM courses INNER JOIN user_courses WHERE user_courses.username = $1);";


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

const user_courses = `
  SELECT DISTINCT
    courses.course_id,
    courses.course_prefix,
    courses.course_name,
    courses.credit_hours,
    users.username = $1 AS "taken"
  FROM
    courses
    JOIN user_courses ON courses.course_id = user_courses.course_id
    JOIN users ON user_courses.username = users.username
  WHERE users.username = $1
  ORDER BY courses.course_id ASC;`;

  app.get("/courses", (req, res) => {
    const taken = req.query.taken;
    // Query to list all the courses taken by a student
  
    db.any(taken ? user_courses : all_courses, [req.session.user.username])
      .then((courses) => {
        res.render("pages/courses", {
          courses,
          action: req.query.taken ? "delete" : "add",
        });
      })
      .catch((err) => {
        res.render("pages/courses", {
          courses: [],
          error: true,
          message: err.message,
        });
      });
  });

app.post("/courses", (req, res) => {
  const course_id = parseInt(req.body.course_id);
  db.tx(async (t) => {
    // This transaction will continue iff the student has satisfied all the
    // required prerequisites.


    // There are either no prerequisites, or all have been taken.
    
      "INSERT INTO user_courses(username, course_prefix, course_id) VALUES ($1, $2);",
      [req.session.user.username, course_id]
    return t.any(all_courses, [req.session.user.username]);
  })
    .then((courses) => {
      //console.info(courses);
      res.render("pages/courses", {
        courses,
        message: `Successfully added course ${req.body.course_id}`,
      });
    })
    .catch((err) => {
      res.render("pages/courses", {
        courses: [],
        error: true,
        message: err.message,
      });
    });
});



app.post("/courses/delete", (req, res) => {
  db.task("delete-course", (task) => {
    return task.batch([
      task.none(
        `DELETE FROM
            user_courses
          WHERE
            username = $1
            AND course_id = '$2';`,
        [req.session.user.username, parseInt(req.body.course_id)]
      ),
      task.any(user_courses, [req.session.user.username]),
    ]);
  })
    .then(([, courses]) => {
      console.info(courses);
      res.render("pages/courses", {
        courses,
        message: `Successfully removed course ${req.body.course_id}`,
        action: "delete",
      });
    })
    .catch((err) => {
      res.render("pages/courses", {
        courses: [],
        error: true,
        message: err.message,
      });
    });
});

app.get('/current_gpa', async (req, res) =>{ // when "current GPA" selected from menu, renders this page

  const course_list = taken_courses
  let num_gpa = `SELECT SUM(quality_points) FROM user_courses AS quality_points_total where username = $1`
  let den_gpa = "SELECT SUM(credit_hours) FROM courses INNER JOIN user_courses ON user_courses.course_id = courses.course_id WHERE (courses.course_id, courses.course_prefix) IN (SELECT user_courses.course_id, user_courses.course_prefix FROM user_courses WHERE user_courses.username = $1);"
  let n, d;
  await db.any(num_gpa, [req.session.user.username])
  .then(numerator =>{
    console.log("Numerator" + numerator[0].sum);
    n = numerator[0].sum;   
  });

  await db.any(den_gpa, [req.session.user.username])
    .then( denominator =>{
      console.log("D")
      console.log(denominator[0].sum) // typeof tells if it is a string of integers
      d = denominator[0].sum
  });

  let fin_gpa = (parseInt(n) / parseInt(d))
    console.log("FINAL GPA" + parseInt(n) +  parseInt(d))
    console.log(fin_gpa)
  await db.any(course_list, [req.session.user.username])
    .then(data => {
      console.log("Success", data)
      data.forEach(async course => {
        const quality_points = course.grade_complete * course.credit_hours;
        await db.query(`UPDATE user_courses SET quality_points = ${quality_points} WHERE username = '${req.session.user.username}' AND course_id = ${course.course_id};`)
      });
      res.render('pages/current_gpa', {
        courses: data ,
        username: req.session.user.username,
        final_gpa: fin_gpa
      }); 
  })
  .catch(err =>{
      console.log("Error", err)
      res.render('pages/current_gpa', {courses: " "})
    }
  )

    
  
});

app.post('/current_gpa', async (req, res) =>{

  var letter_grade = req.body.letter_grade; // form must have letter_grade
  const course = req.body.course;
  console.log(letter_grade, course)
  //$1 is the grade, $2 is the course, $3 is the username. Update the grade in the user_courses table for the given course and username. We need to get the code of the course with the course name and then update the grade in the user_courses table
  const query = "UPDATE user_courses SET grade_complete = $1 WHERE (course_id, course_prefix) = (SELECT course_id, course_prefix FROM courses WHERE course_name = $2) AND username = $3"; 
  if(letter_grade === "A")
  {    await db.query(query,  [4.0, course, req.session.user.username]);}

  else if(letter_grade = "A-")
  {    await db.query (query, [3.7, course, req.session.user.username]);}

  else if(letter_grade = "B+")
  {    await db.query(query, [3.3, course, req.session.user.username]);}

  else if(letter_grade = "B")
  {    await db.query (query, [3.0, course, req.session.user.username]);}

  else if(letter_grade = "B-")
  {    await db.query (query, [2.7, course, req.session.user.username]);}

  else if(letter_grade = "C+")
  {    await db.query (query, [2.3, course, req.session.user.username]);}

  else if(letter_grade = "C")
  {    await db.query (query, [2.0, course, req.session.user.username]);}
 
  else if(letter_grade = "C-")
  {    await db.query (query, [1.7, course, req.session.user.username]);}

  else if(letter_grade = "D+")
  {    await db.query (query, [1.3, course, req.session.user.username]);}

  else if(letter_grade = "D")
  {    await db.query (query, [1.0, course, req.session.user.username]);}

  else if(letter_grade = "D-")
  {    await db.query (query, [0.7, course, req.session.user.username]);}

  else if(letter_grade = "F")
  {    await db.query (query, [0.0, course, req.session.user.username]);}
  else
  {
    res.render('pages/current_gpa'); //add error message about improper letter choice
  }
  res.redirect('/current_gpa'); 
})


app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});
