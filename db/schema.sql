drop database coyote_db;
create database coyote_db;

use coyote_db;
create table coyotes
(
    id int not null auto_increment,
    coyoteName varchar (64),
    longitude decimal,
    latitude decimal,
    active boolean,
    primary key (id)
);