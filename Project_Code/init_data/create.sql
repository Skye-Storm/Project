CREATE TABLE users(
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL
);

CREATE TABLE courses(
    course_id INTEGER NOT NULL,
    course_prefix VARCHAR(4) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    credit_hours INTEGER NOT NULL
);

-- add constraint to make sure that the course_id and course_prefix are unique
ALTER TABLE courses ADD CONSTRAINT unique_course UNIQUE (course_id, course_prefix);
ALTER TABLE courses ADD CONSTRAINT courses_pk PRIMARY KEY (course_id, course_prefix);
    
CREATE TABLE user_courses(
    --get course_prefix and course_id from courses table
    course_id INTEGER NOT NULL,
    course_prefix VARCHAR(4) NOT NULL,
    username VARCHAR(50) NOT NULL,

    FOREIGN KEY (course_id, course_prefix) REFERENCES courses (course_id, course_prefix),
    FOREIGN KEY (username) REFERENCES users (username)
);