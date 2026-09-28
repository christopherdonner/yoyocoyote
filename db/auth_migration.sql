USE coyote_db;

CREATE TABLE IF NOT EXISTS app_users (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(32) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(161) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_app_users_username (username),
    UNIQUE KEY uq_app_users_email (email)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash CHAR(64) NOT NULL,
    user_id INT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (token_hash),
    KEY ix_auth_sessions_expiry (expires_at),
    CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id)
        REFERENCES app_users (id) ON DELETE CASCADE
);

-- Older seeded userid values were not associated with authenticated accounts.
UPDATE coyotes SET userid = NULL;