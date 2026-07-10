-- ==============================================================================
-- RetailPOS Database Schema
-- Domain: pos.taffybd.com
-- Note: Run this script in a fresh MySQL database (e.g., pos_db)
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. ROLES & PERMISSIONS (RBAC)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'products.create'
  `group_module` VARCHAR(50) NOT NULL, -- e.g., 'Products', 'Sales'
  `description` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` INT NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. CATALOG MANAGEMENT
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(100) NOT NULL UNIQUE,
  `barcode` VARCHAR(100) NULL UNIQUE,
  `category_id` INT NULL,
  `cost_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `stock_qty` INT NOT NULL DEFAULT 0,
  `low_stock_alert` INT NOT NULL DEFAULT 5,
  `image_path` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_variations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL, -- e.g., 'Size L - Red'
  `sku` VARCHAR(100) NOT NULL UNIQUE,
  `barcode` VARCHAR(100) NULL UNIQUE,
  `additional_price` DECIMAL(10, 2) DEFAULT 0.00,
  `stock_qty` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. CUSTOMERS & SALES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `email` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` VARCHAR(50) NOT NULL UNIQUE, -- e.g., INV-20260710-0001
  `customer_id` INT NULL,
  `user_id` INT NOT NULL, -- Cashier who processed the sale
  `subtotal` DECIMAL(12, 2) NOT NULL,
  `discount_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `tax_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `grand_total` DECIMAL(12, 2) NOT NULL,
  `status` ENUM('Completed', 'Refunded', 'Partial Refund') DEFAULT 'Completed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `variation_id` INT NULL,
  `qty` INT NOT NULL,
  `unit_price` DECIMAL(10, 2) NOT NULL,
  `line_total` DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`variation_id`) REFERENCES `product_variations`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `method` ENUM('Cash', 'Card', 'bKash', 'Nagad', 'Bank Transfer') NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. RETURNS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `returns` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `user_id` INT NOT NULL, -- Staff who processed return
  `return_amount` DECIMAL(12, 2) NOT NULL,
  `status` ENUM('Completed') DEFAULT 'Completed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `return_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `return_id` INT NOT NULL,
  `order_item_id` INT NOT NULL,
  `return_qty` INT NOT NULL,
  `unit_price` DECIMAL(10, 2) NOT NULL,
  `return_amount` DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- 5. SEED DATA (Default Setup)
-- ==============================================================================

-- Insert Default Roles
INSERT INTO `roles` (`id`, `name`, `description`) VALUES 
(1, 'Admin', 'Full system access'),
(2, 'Manager', 'Can manage products, inventory, and view reports'),
(3, 'Cashier', 'Can process sales and returns only');

-- Insert Granular Permissions (No Backup/Restore)
INSERT INTO `permissions` (`id`, `name`, `group_module`, `description`) VALUES 
(1, 'sales.create', 'Sales', 'Can create new sales'),
(2, 'sales.view', 'Sales', 'Can view sales history'),
(3, 'sales.return', 'Sales', 'Can process sales returns'),
(4, 'products.create', 'Products', 'Can add new products'),
(5, 'products.edit', 'Products', 'Can edit existing products'),
(6, 'products.delete', 'Products', 'Can delete products'),
(7, 'products.view', 'Products', 'Can view products'),
(8, 'customers.manage', 'Customers', 'Can add and edit customers'),
(9, 'reports.view', 'Reports', 'Can view all reports'),
(10, 'users.manage', 'Admin', 'Can add, edit, and deactivate staff accounts'),
(11, 'roles.manage', 'Admin', 'Can create roles and assign permissions');

-- Assign ALL Permissions to Admin (Role 1)
INSERT INTO `role_permissions` (`role_id`, `permission_id`) 
SELECT 1, id FROM `permissions`;

-- Assign specific permissions to Manager (Role 2)
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES 
(2, 2), (2, 4), (2, 5), (2, 7), (2, 8), (2, 9);

-- Assign specific permissions to Cashier (Role 3)
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES 
(3, 1), (3, 2), (3, 3), (3, 7), (3, 8);

-- Create Default Admin User
-- Email: admin@taffybd.com | Password: admin123
-- Note: The password_hash below is a standard bcrypt hash for 'admin123' (Cost factor 10)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role_id`, `is_active`) VALUES 
(1, 'System Admin', 'admin@taffybd.com', '$2b$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 1, 1);

SET FOREIGN_KEY_CHECKS = 1;