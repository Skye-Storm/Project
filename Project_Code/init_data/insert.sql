INSERT INTO users (username, password) VALUES 
('user', 'password');

INSERT INTO courses (course_id, course_prefix, course_name, credit_hours) VALUES 
(1000, 'CSCI', 'Intro to Computer Science', 3);

INSERT INTO user_courses (username, course_id) VALUES 
('user', 1000);