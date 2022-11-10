INSERT INTO users (username, password) VALUES 
('user', '$2b$10$c57OUAmg7GF3JYAZq2K8ROZydmi8ZC1M0UAvszDa25BwvlOULVaHa'), --username is user, password is password
('', '1');

INSERT INTO courses (course_id, course_prefix, course_name, credit_hours) VALUES 
(1000, 'CSCI', 'Intro to Computer Science', 3);

INSERT INTO user_courses (username, course_prefix, course_id) VALUES 
('user', 'CSCI', 1000);