CREATE TABLE users(
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL
);

CREATE TABLE courses(
    course_id NUMERIC PRIMARY KEY,
    course_prefix VARCHAR(100) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    credit_hours NUMERIC NOT NULL
);

CREATE TABLE user_courses(
    course_id INTEGER NOT NULL REFERENCES courses (course_id),
    username VARCHAR(50) NOT NULL REFERENCES users (username)
);