drop database if exists `lms-db`;
create database `lms-db`;
use `lms-db`;

create table student (
    id int not null auto_increment,
    group_id int not null,
    name varchar(255) not null,
    email varchar(255) not null,
    password varchar(255) not null,
    primary key (id)
);


create table `group` (
    id int not null auto_increment,
    name varchar(255) not null,
    primary key (id)
);

create table teacher (
    id int not null auto_increment,
    name varchar(255) not null,
    email varchar(255) not null,
    password varchar(255) not null,
    primary key (id)
);

create table test (
    id int not null auto_increment,
    name varchar(255) not null,
    teacher_id int not null,
    group_id int not null,
    start_time datetime not null,
    end_time datetime not null,
    primary key (id),
    foreign key (teacher_id) references teacher(id),
    foreign key (group_id) references `group`(id)
);

create table question (
    id int not null auto_increment,
    text varchar(255) not null,
    answer varchar(255) not null,
    primary key (id)
);

create table test_question (
    test_id int not null,
    question_id int not null,
    primary key (test_id, question_id),
    foreign key (test_id) references test(id),
    foreign key (question_id) references question(id)
);


create table test_student (
    test_id int not null,
    student_id int not null,
    result double not null,
    primary key (test_id, student_id),
    foreign key (test_id) references test(id),
    foreign key (student_id) references student(id)
);

create table answer (
    id int not null auto_increment,
    student_id int not null,
    question_id int not null,
    text varchar(255) not null,
    primary key (id),
    foreign key (student_id) references student(id),
    foreign key (question_id) references question(id)
);

create table achievement (
    id int not null primary key,
    title varchar(255)
);

create table achievement_student (
    achievement_id int not null,
    student_id int not null,
    primary key (achievement_id, student_id),
    foreign key (achievement_id) references achievement(id),
    foreign key (student_id) references student(id)
);


-- procedure that returns the newest test for the given id of student
delimiter $$
create procedure get_latest_test (in student_id int)
begin 
    select * from test where id
                                 in (select id from test where group_id = get_group_id(student_id))
    and end_time > now() 
    and start_time < now()
                       limit 1;
end$$
delimiter ;
# call get_latest_test(5);


-- procedure that returns questions for the given test id
delimiter $$
create procedure get_questions_for_test (in test_id int)
begin 
    select * from question where id
                                 in (select question_id from test_question where test_id = test_id);
end$$
delimiter ;
# call get_questions_for_test(3);


-- procedure that returns the best n students by sum of all results
delimiter $$
create procedure get_the_best_n_students_in_grup (in n int)
begin 
    select student.name, sum(test_student.result) as total_result from student
    join test_student on student.id = test_student.student_id
    group by student.id
    order by total_result desc
    limit n;
end$$
delimiter ;

-- function that returns group id for the given student id
delimiter $$
create function get_group_id (student_id int)
returns int
DETERMINISTIC
begin 
    declare gi int;
    select group_id into gi from student where student.id = student_id;
    return gi;
end$$
delimiter ;
# select get_group_id(1);

-- function that returns average test score for the grop
delimiter $$
create function get_average_test_score (group_id int)
returns double
DETERMINISTIC
begin 
    declare avg double;
    select avg(result) into avg from test_student
    join test on test_student.test_id = test.id
    where test.group_id = group_id;
    return avg;
end$$
delimiter ;


-- trigger that checks if the student is registered
delimiter $$
create trigger check_registered_student before insert on student
for each row
begin
    if (select count(*) from student where email = new.email) > 0 then
        signal sqlstate '45000' set message_text = 'This student is already registered';
    end if;
end$$
delimiter ;

-- trigger that checks if the teacher is registered
delimiter $$
create trigger check_registered_teacher before insert on teacher
for each row
begin
    if (select count(*) from teacher where email = new.email) > 0 then
        signal sqlstate '45000' set message_text = 'This teacher is already registered';
    end if;
end$$
delimiter ;


-- trgger checks that the result is not added twice
delimiter $$
create trigger check_added_result before insert on test_student
for each row
begin
    if (select count(*) from test_student where test_id = new.test_id and student_id = new.student_id) > 0 then
        signal sqlstate '45000' set message_text = 'This result is already added';
    end if;
end$$
delimiter ;

