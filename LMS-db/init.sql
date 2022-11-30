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
    id int not null auto_increment,
    title varchar(255),
    description varchar(255),
    primary key (id)
);

create table achievement_student (
    achievement_id int not null,
    student_id int not null,
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
    and id not in (select test_id from test_student where student_id = student_id)
    order by end_time desc
                       limit 1;
end$$
delimiter ;
# call get_latest_test(5);


-- procedure that returns questions for the given test id
# call get_questions_for_test(3);

-- procedure that returns achievements for the given student id
delimiter $$
create procedure get_achievements_for_student (in student_id int)
begin 
    select * from achievement where id
                                 in (select achievement_id from achievement_student where achievement_student.student_id = student_id);
end$$
delimiter ;


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
call get_the_best_n_students_in_grup(20);
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


-- function that returns the best student in the group
delimiter $$
create function get_the_best_student_in_group (group_id int)
returns varchar(255)
DETERMINISTIC
begin 
    declare name varchar(255);
    select student.name into name from student
    join test_student on student.id = test_student.student_id
    join test on test_student.test_id = test.id
    where test.group_id = group_id
    group by student.id
    order by sum(test_student.result) desc
    limit 1;
    return name;
end$$
delimiter ;

# select get_the_best_student_in_group(4);

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

-- trigger that give ace achievment to the student
delimiter $$
create trigger give_ace_achievement after insert on test_student
for each row
begin
    if new.result >= 100 then
        insert into achievement_student (achievement_id, student_id) values (2, new.student_id);
    end if;
end$$
delimiter ;


-- trigger that give the best student achievment to the student in the group
delimiter $$
create trigger give_the_best_student_achievement after insert on test_student
for each row
begin
    if new.student_id = (select id from student where name = get_the_best_student_in_group(get_group_id(new.student_id))) then
        insert into achievement_student (achievement_id, student_id) values (1, new.student_id);
    end if;
end$$
delimiter ;


