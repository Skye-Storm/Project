DROP TABLE IF EXISTS students CASCADE;
CREATE TABLE students(
    student_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    --email VARCHAR(200) NOT NULL,
    --year VARCHAR(15) NOT NULL,
    --major VARCHAR(30) NOT NULL,
    --degree VARCHAR(15) NOT NULL
);

DROP TABLE IF EXISTS courses CASCADE;
CREATE TABLE courses(
    course_prefix VARCHAR(100) PRIMARY KEY,
    course_id NUMERIC PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    credit_hours NUMERIC NOT NULL
);

DROP TABLE IF EXISTS student_courses;
CREATE TABLE student_courses(
    course_id INTEGER NOT NULL REFERENCES courses (course_id),
    student_id INTEGER NOT NULL REFERENCES students (student_id)
);

CREATE TABLE users(
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL
);
