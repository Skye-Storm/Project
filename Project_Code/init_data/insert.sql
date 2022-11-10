INSERT INTO users (username, password) VALUES 
('asd', '$2b$10$X9I23OjqzTuXLV4WwaGnWepuR0myejQycSlg0sBcPPRKAVi2hKUzq'); --username is asd, password is asd

INSERT INTO courses (course_id, course_prefix, course_name, credit_hours) VALUES 
(1000, 'CSCI', 'Intro to Computer Science', 3),
(1000, 'ASEN', 'Aerospace Something', 4),
(2012, 'TEST', 'Test Course 3', 1);

INSERT INTO user_courses (username, course_prefix, course_id) VALUES 
('asd', 'CSCI', 1000);