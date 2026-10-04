-- Hiram Debt Tracker - schema
-- MariaDB 10.4 / MySQL 5.7+ compatible.
-- Load with:  mysql -u root < database/schema.sql

CREATE DATABASE IF NOT EXISTS hiram_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE hiram_db;

CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name          VARCHAR(80)  NOT NULL,
    email         VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    currency      CHAR(3)      NOT NULL DEFAULT 'PHP',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE = InnoDB;

-- Opaque bearer tokens; only the SHA-256 hash is stored.
CREATE TABLE IF NOT EXISTS auth_tokens (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED    NOT NULL,
    token_hash CHAR(64)        NOT NULL,
    expires_at DATETIME        NOT NULL,
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tokens_hash (token_hash),
    KEY idx_tokens_user (user_id, created_at),
    KEY idx_tokens_expiry (expires_at),
    CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- People who owe the user money.
CREATE TABLE IF NOT EXISTS debtors (
    id         INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED      NOT NULL,
    name       VARCHAR(80)       NOT NULL,
    phone      VARCHAR(30)       NULL,
    note       VARCHAR(500)      NULL,
    created_at DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME          NULL,
    PRIMARY KEY (id),
    KEY idx_debtors_user (user_id, deleted_at),
    KEY idx_debtors_sync (user_id, updated_at),
    CONSTRAINT fk_debtors_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- Individual amounts owed. status is always derived from the payment total.
CREATE TABLE IF NOT EXISTS debts (
    id         INT UNSIGNED            NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED            NOT NULL,
    debtor_id  INT UNSIGNED            NOT NULL,
    amount     DECIMAL(12, 2) UNSIGNED NOT NULL,
    due_date   DATE           NULL,
    note       VARCHAR(500)   NULL,
    status     ENUM('pending', 'partial', 'settled') NOT NULL DEFAULT 'pending',
    settled_at DATETIME       NULL,
    created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME       NULL,
    PRIMARY KEY (id),
    KEY idx_debts_user_status (user_id, status, deleted_at),
    KEY idx_debts_user_due (user_id, due_date),
    KEY idx_debts_user_sync (user_id, updated_at),
    KEY idx_debts_debtor (debtor_id),
    CONSTRAINT fk_debts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_debts_debtor FOREIGN KEY (debtor_id) REFERENCES debtors (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS payments (
    id         INT UNSIGNED            NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED            NOT NULL,
    debt_id    INT UNSIGNED            NOT NULL,
    amount     DECIMAL(12, 2) UNSIGNED NOT NULL,
    method     ENUM('cash','gcash','maya','bank','other') NOT NULL DEFAULT 'cash',
    paid_at    DATETIME                NOT NULL,
    note       VARCHAR(300)            NULL,
    created_at DATETIME                NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME                NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME                NULL,
    PRIMARY KEY (id),
    KEY idx_payments_debt (debt_id, deleted_at),
    KEY idx_payments_user_sync (user_id, updated_at),
    KEY idx_payments_user_paid (user_id, paid_at),
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_debt FOREIGN KEY (debt_id) REFERENCES debts (id) ON DELETE CASCADE
) ENGINE = InnoDB;
