const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

const not_taken_courses = "SELECT * FROM courses WHERE (course_id, course_prefix) NOT IN (SELECT course_id, course_prefix FROM user_courses WHERE username = $1);";
const taken_courses = "SELECT * FROM courses INNER JOIN user_courses ON user_courses.course_id = courses.course_id AND user_courses.course_prefix = courses.course_prefix WHERE username = $1;";
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
  res.redirect('/home'); 
});

app.get('/home', (req, res) => {
  res.render('pages/home');
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
	message: `Wrong password, please try again`,
      });
    }
  }
  else {
    res.render('pages/login', {
      error: 'Invalid username or password',
      message: `Invalid username, please try again`,
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
      res.render("pages/register", {
	error: 'Username exists',
	message: `Username already exists, please try another one`,});
    });
});


app.get("/courses", (req, res) => {
  db.any(not_taken_courses, [req.session.user.username])
    .then((courses) => {
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

app.get("/my_courses", (req, res) => {
  db.any(taken_courses, [req.session.user.username])
    .then((courses) => {
      res.render("pages/my_courses", {
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

app.post("/courses/delete", (req, res) => {
  const course_prefix = req.body.course_info[0];
  const course_id = req.body.course_info[1];
  const query = "DELETE FROM user_courses WHERE course_id = $1 AND course_prefix = $2 AND username = $3"; 
  db.any(query, [course_id, course_prefix, req.session.user.username])
  .then((data) => { 
    res.redirect("/my_courses");
  })
  .catch((err) => { 
    console.log(err);
  res.redirect("/my_courses");
  });
});

app.post('/courses/add', (req, res)=>{
  const course_prefix = req.body.course_info[0];
  const course_id = req.body.course_info[1];
  const query = "INSERT INTO user_courses (course_id, course_prefix, username) VALUES ($1, $2, $3)";
  db.any(query, [course_id, course_prefix, req.session.user.username])
  .then((data)=>{
    res.redirect("/courses");
  })
  .catch((err) =>{
    console.log(err);
    res.redirect("/courses");
  });
});

app.post('/courses/addnew', (req, res) =>
{
  var course_prefix = req.body.prefix;
  var course_id = req.body.id;
  var course_name = req.body.name;
  var credit_hours = req.body.hours;

  const query = "INSERT INTO courses (course_id, course_prefix, course_name, credit_hours) VALUES ($1, $2, $3, $4)";
  db.any(query, [course_id, course_prefix, course_name, credit_hours])
  .then((data)=>{
    res.redirect("/courses");
  })
  .catch((err) =>{
    console.log(err);
    res.redirect("/courses");
  });


});


app.get('/current_gpa', async (req, res) =>{ // when "current GPA" selected from menu, renders this page

  const course_list = taken_courses
  let num_gpa = `SELECT SUM(quality_points) FROM user_courses AS quality_points_total where username = $1`
  let den_gpa = `SELECT SUM(credit_hours) FROM courses INNER JOIN user_courses ON user_courses.course_id = courses.course_id AND user_courses.course_prefix = courses.course_prefix WHERE username = $1;`
  let n, d = 0;
    
  await db.any(course_list, [req.session.user.username])
    .then(async data => {
      var resultArr = []
      var numerator = 0;
      data.forEach(async course => {
        const quality_points = course.grade_complete * course.credit_hours;
        const result = await db.query(`UPDATE user_courses SET quality_points = ${quality_points} WHERE username = '${req.session.user.username}' AND course_id = ${course.course_id} RETURNING *;`)
        //const updated = await db.query(course_list, [req.session.user.username])
        resultArr.push(result[0])
        //console.log(typeof(result[0].quality_points), result[0].quality_points)
        numerator += result[0].quality_points;
        console.log(numerator)
        //n += result.quality_points;
      });
      await db.any(num_gpa, [req.session.user.username])
      .then(numerator =>{
        console.log("Numerator " + numerator[0].sum);
        n = numerator[0].sum;   
      });

      await db.any(den_gpa, [req.session.user.username])
        .then( denominator =>{
        console.log("Denominator " + denominator[0].sum)
        d = denominator[0].sum
      });
      console.log(resultArr)
      let start_gpa = (parseInt(n) / parseInt(d))
      let fin_gpa = start_gpa.toFixed(2)
      console.log("FINAL GPA " + parseInt(n) + " " +  parseInt(d))
      console.log(fin_gpa)
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

  const course_list = taken_courses

  var letter_grade = req.body.letter_grade; // form must have letter_grade
  const course = req.body.course;
  console.log(letter_grade, course)
  //$1 is the grade, $2 is the course, $3 is the username. Update the grade in the user_courses table for the given course and username. We need to get the code of the course with the course name and then update the grade in the user_courses table
  const query = "UPDATE user_courses SET grade_complete = $1 WHERE (course_id, course_prefix) = (SELECT course_id, course_prefix FROM courses WHERE course_name = $2) AND username = $3"; 
  if(letter_grade === "A")
  {    await db.query(query,  [4.0, course, req.session.user.username]);}

  else if(letter_grade === "A-")
  {    await db.query (query, [3.7, course, req.session.user.username]);}

  else if(letter_grade === "B+")
  {    await db.query(query, [3.3, course, req.session.user.username]);}

  else if(letter_grade === "B")
  {    await db.query (query, [3.0, course, req.session.user.username]);}

  else if(letter_grade === "B-")
  {    await db.query (query, [2.7, course, req.session.user.username]);}

  else if(letter_grade === "C+")
  {    await db.query (query, [2.3, course, req.session.user.username]);}

  else if(letter_grade === "C")
  {    await db.query (query, [2.0, course, req.session.user.username]);}
 
  else if(letter_grade === "C-")
  {    await db.query (query, [1.7, course, req.session.user.username]);}

  else if(letter_grade === "D+")
  {    await db.query (query, [1.3, course, req.session.user.username]);}

  else if(letter_grade === "D")
  {    await db.query (query, [1.0, course, req.session.user.username]);}

  else if(letter_grade === "D-")
  {    await db.query (query, [0.7, course, req.session.user.username]);}

  else if(letter_grade === "F")
  {    await db.query (query, [0.0, course, req.session.user.username]);}
	
  res.redirect('/current_gpa'); 
})


app.get('/print', async (req, res) =>{ // when "current GPA" selected from menu, renders this page

  const course_list = taken_courses
  let num_gpa = `SELECT SUM(quality_points) FROM user_courses AS quality_points_total where username = $1`
  let den_gpa = `SELECT SUM(credit_hours) FROM courses INNER JOIN user_courses ON user_courses.course_id = courses.course_id AND user_courses.course_prefix = courses.course_prefix WHERE username = $1;`
  let n, d = 0;
    
  await db.any(course_list, [req.session.user.username])
    .then(async data => {
      var resultArr = []
      var numerator = 0;
      data.forEach(async course => {
        const quality_points = course.grade_complete * course.credit_hours;
        const result = await db.query(`UPDATE user_courses SET quality_points = ${quality_points} WHERE username = '${req.session.user.username}' AND course_id = ${course.course_id} RETURNING *;`)
        resultArr.push(result[0])
        console.log(typeof(result[0].quality_points), result[0].quality_points)
        numerator += result[0].quality_points;
        console.log(numerator)
        n += result.quality_points;
      });
      await db.any(num_gpa, [req.session.user.username])
      .then(numerator =>{
        console.log("Numerator " + numerator[0].sum);
        n = numerator[0].sum;   
      });

      await db.any(den_gpa, [req.session.user.username])
        .then( denominator =>{
        console.log("Denominator " + denominator[0].sum)
        d = denominator[0].sum
      });
      console.log(resultArr)
      let start_gpa = (parseInt(n) / parseInt(d))
      let fin_gpa = start_gpa.toFixed(2)
      console.log("FINAL GPA " + parseInt(n) + " " +  parseInt(d))
      console.log(fin_gpa)
      res.render('pages/print', {
        courses: data ,
        username: req.session.user.username,
        final_gpa: fin_gpa
      }); 
  })
  .catch(err =>{
      console.log("Error", err)
      res.render('pages/print', {courses: " "})
    }
  )

    
  
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render('pages/login', {
	message: `Successfully logged out!`,
      });
});
