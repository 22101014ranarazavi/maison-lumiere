-- Maison Lumiere — perfume shop schema (MySQL 8+)
-- Created by backend/scripts/setup.php

CREATE TABLE IF NOT EXISTS categories (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug        VARCHAR(60)  NOT NULL,
    name        VARCHAR(80)  NOT NULL,
    description VARCHAR(255) NOT NULL DEFAULT '',
    accent      CHAR(7)      NOT NULL DEFAULT '#b08d57',
    sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_slug (slug)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    sku              VARCHAR(30)  NOT NULL,
    name             VARCHAR(120) NOT NULL,
    house            VARCHAR(80)  NOT NULL DEFAULT 'Maison Lumière',
    description      TEXT         NOT NULL,
    category_id      INT UNSIGNED NOT NULL,
    gender           ENUM('women','men','unisex') NOT NULL DEFAULT 'unisex',
    size_ml          SMALLINT UNSIGNED NOT NULL DEFAULT 50,
    price            DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2) NULL,
    stock            INT UNSIGNED NOT NULL DEFAULT 0,
    top_notes        VARCHAR(255) NOT NULL DEFAULT '',
    heart_notes      VARCHAR(255) NOT NULL DEFAULT '',
    base_notes       VARCHAR(255) NOT NULL DEFAULT '',
    color_a          CHAR(7) NOT NULL DEFAULT '#e3d2b8',
    color_b          CHAR(7) NOT NULL DEFAULT '#8a6f4d',
    shape            ENUM('tall','square','round','faceted') NOT NULL DEFAULT 'round',
    featured         TINYINT(1) NOT NULL DEFAULT 0,
    rating           DECIMAL(2,1) NOT NULL DEFAULT 0.0,
    tagline          VARCHAR(255) NULL,
    story            TEXT NULL,
    craft_notes      TEXT NULL,
    longevity        VARCHAR(60)  NULL,
    sillage          VARCHAR(60)  NULL,
    best_season      VARCHAR(60)  NULL,
    occasion         VARCHAR(140) NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_sku (sku),
    KEY idx_products_category (category_id),
    KEY idx_products_featured (featured),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id)
        REFERENCES categories (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id INT UNSIGNED NOT NULL,
    author     VARCHAR(80)  NOT NULL,
    rating     TINYINT UNSIGNED NOT NULL,
    comment    TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_reviews_product (product_id),
    CONSTRAINT fk_reviews_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    reference     VARCHAR(16) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    email         VARCHAR(190) NOT NULL,
    phone         VARCHAR(30)  NULL,
    address       VARCHAR(200) NOT NULL,
    city          VARCHAR(100) NOT NULL,
    postal_code   VARCHAR(20)  NOT NULL,
    country       VARCHAR(60)  NOT NULL,
    notes         TEXT NULL,
    subtotal      DECIMAL(10,2) NOT NULL,
    shipping      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total         DECIMAL(10,2) NOT NULL,
    status        ENUM('pending','paid','shipped','cancelled') NOT NULL DEFAULT 'pending',
    tracking_number VARCHAR(60) NULL,
    admin_note      TEXT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_reference (reference),
    KEY idx_orders_email (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id     INT UNSIGNED NOT NULL,
    product_id   INT UNSIGNED NULL,
    product_name VARCHAR(120) NOT NULL,
    unit_price   DECIMAL(10,2) NOT NULL,
    quantity     SMALLINT UNSIGNED NOT NULL,
    size_ml      SMALLINT UNSIGNED NOT NULL DEFAULT 50,
    PRIMARY KEY (id),
    KEY idx_order_items_order (order_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
        REFERENCES orders (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contacts (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(190) NOT NULL,
    subject    VARCHAR(150) NOT NULL,
    message    TEXT NOT NULL,
    handled    TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email      VARCHAR(190) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_newsletter_email (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
