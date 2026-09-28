USE coyote_db;

ALTER TABLE coyotes
    ADD COLUMN details TEXT NULL,
    ADD COLUMN photo_mime VARCHAR(32) NULL,
    ADD COLUMN photo_data MEDIUMBLOB NULL;