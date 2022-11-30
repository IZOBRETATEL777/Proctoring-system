use `lms-db`;

insert into `group` (name) values ('IT20');
insert into `group` (name) values ('IT21');
insert into `group` (name) values ('IT22');


-- populate achievements table
insert into achievement (title, `description`) values ('First place', 'First place in the group');
insert into achievement (title, `description`) values ('Ace', 'All tests passed');

insert into student (group_id, name, email, password) values (1, 'Ivanov Ivan', 'ivan@mail.ru', '$2b$10$5yXxhbuLB.9ix4ps5j4EQ.L.qItL8iKf/znPhA0ertvxPJN.d/OQ6');
insert into student (group_id, name, email, password) values (2, 'Petrov Petr', 'petr@mail.ru', '$2b$10$5yXxhbuLB.9ix4ps5j4EQ.L.qItL8iKf/znPhA0ertvxPJN.d/OQ6');
insert into student (group_id, name, email, password) values (2, 'Sidorov Sidor', 'sidor@mailru', '$2b$10$5yXxhbuLB.9ix4ps5j4EQ.L.qItL8iKf/znPhA0ertvxPJN.d/OQ6');


-- populate teacher via registration

insert into test (name, teacher_id, group_id, start_time, end_time) values ('Test 1', 1, 1, '2021-01-01 00:00:00', '2021-01-01 00:00:00');
insert into test (name, teacher_id, group_id, start_time, end_time) values ('Test 2', 1, 1, '2021-01-01 00:00:00', '2021-01-01 00:00:00');
insert into test (name, teacher_id, group_id, start_time, end_time) values ('Test 3', 1, 1, '2022-01-01 00:00:00', '2023-01-01 00:00:00');


insert into question (text, answer) values ('2+2', '4');
insert into question (text, answer) values ('2+3', '5');
insert into question (text, answer) values ('2+4', '6');
insert into question (text, answer) values ('2+5', '7');
insert into question (text, answer) values ('2+2', '4');
insert into question (text, answer) values ('2+3', '5');
insert into question (text, answer) values ('2+4', '6');

