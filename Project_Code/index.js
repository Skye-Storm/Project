const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const axios = require('axios');

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
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.listen(3000);
console.log('Server is listening on port 3000');

app.get('/', (req, res) =>{
  res.redirect('/login'); //this will call the /home route in the API
});

app.get('/login', (req, res) =>{
  res.render('pages/login'); //this will call the /home route in the API
});

// Login submission
app.post('/login', async (req, res) =>{
  const user = req.body.username;
  const query = "SELECT * FROM users WHERE username = $1";
  const values = [user];
  db.one(query, values)
    .then(async (data) => {
       user.username = data.username;
       user.password = data.password;
       const match = await bcrypt.compare(req.body.password, data.password);         
       if (match != 1){
         //Incorrect Password here;
       } else {
         req.session.user = {
         api_key: process.env.API_KEY,
       };
         req.session.save();
       }
         res.redirect("/discover");
       })
         .catch((err) => {
         console.log(err);
         res.redirect("/register");
       });
});

app.get('/register', (req, res) => {
  res.render('pages/register',{});
});

// Register submission
app.post('/register', async (req, res) => {
const user = req.body.username;
const hash = await bcrypt.hash(req.body.password, 10);
const query = "INSERT INTO users (username, password) VALUES ($1, $2);"
db.any (query, [user, hash])
  .then((data) => {
     user.username = data.user;
     hash.password = data.password;
     res.redirect("/");
   })
   .catch((err) => {
      console.log(err);
      res.redirect("/register");
    });
});

app.get('/current_gpa', (req, res) =>{ // when "current GPA" selected from menu, renders this page
  // const course_list = "SELECT * FROM courses INNER JOIN student_courses ON student_courses.course_id = courses.course_id INNER JOIN students ON students.student_id = student_courses.student_id GROUP BY courses.course_id;";
  const course_list = "SELECT * FROM courses"
  db.any(course_list)
  .then(data => {
    console.log("Success", data)
    res.render('pages/current_gpa', {courses: data }); 
  })
  .catch(err =>{
      console.log("Error", err)
      res.render('pages/current_gpa', {courses: " "})
    }
  )
  
});

app.post('/current_gpa', (req, res) =>{

  const letter_grade = req.body.letter_grade; // form must have letter_grade
  const course = req.body.course;
  console.log(letter_grade, course)
  const query = "INSERT INTO student_courses (grade_complete) VALUES ($1)"; // based upon the letter_grade inserted, the db inserts into that specific course
  if(letter_grade === "A")
  {    db.any (query, [4.0])    .catch((err) =>{  console.log(err);   res.redirect("current_gpa");})  }

  if(letter_grade = "A-")
  {    db.any (query, [3.7])    .catch((err) =>{  console.log(err);   res.redirect("current_gpa");})  }

  if(letter_grade = "B+")
  {    db.any (query, [3.3])    .catch((err) =>{  console.log(err);   res.redirect("current_gpa");})  }

  if(letter_grade = "B")
  {    db.any (query, [3.0])    .catch((err) =>{  console.log(err);   res.redirect("current_gpa");})  }

  if(letter_grade = "B-")
  {    db.any (query, [2.7])    .catch((err) =>{  console.log(err);   res.redirect("current_gpa");})  }

  if(letter_grade = "C+")
  {    db.any (query, [2.3])    .catch((err) =>{  console.log(err);   res.redirect("current_gpa");})  }

  if(letter_grade = "C")
  {    db.any (query, [2.0])    .catch((err) =>{  console.log(err);   res.redirect("current_gpa");})  }

  if(letter_grade = "C-")
  {    db.any (query, [1.7])    .catch((err) =>{  console.log(err);   res.redirect("current_gpa");})  }

  if(letter_grade = "D+")
  {    db.any (query, [1.3])    .catch((err) =>{  console.log(err);   res.redirect("current_gpa");})  }

  if(letter_grade = "D")
  {    db.any (query, [1.0])    .catch((err) =>{  console.log(err);   res.redirect("current_gpa");})  }

  if(letter_grade = "D-")
  {    db.any (query, [0.7])    .catch((err) =>{  console.log(err);   res.redirect("current_gpa");})  }

  if(letter_grade = "F")
  {    db.any (query, [0.0])    .catch((err) =>{  console.log(err);   res.redirect("current_gpa");})  }
  else
  {
    res.render('pages/current_gpa'); //add error message about improper letter choice
  }
  res.render('pages/current_gpa', {courses: ""}); 
})


app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/login");
});