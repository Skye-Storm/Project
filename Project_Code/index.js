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

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/login");
});