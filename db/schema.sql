drop database coyote_db;
create database coyote_db;

use coyote_db;
create table coyotes
(
    id int not null auto_increment,
    coyoteName varchar (64),
    longitude decimal(14,12),
    latitude decimal(14,12),
    dtime bigint,
    active boolean,
    userid int,
    primary key (id)
);
create table users
(
    id int not null auto_increment,
    userName varchar (64),
    password varchar (64),
    firstName varchar (64),
    lastName varchart (64),
    email varchart (64)
);