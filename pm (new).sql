-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 10, 2025 at 05:22 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pm`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` bigint(20) NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`) VALUES
(1, 'Coffee'),
(2, 'Dairy'),
(6, 'Equipment'),
(7, 'Ingredients'),
(4, 'Packaging'),
(8, 'Pastries'),
(3, 'Sweeteners'),
(5, 'Syrups');

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

CREATE TABLE `items` (
  `id` bigint(20) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `category_id` bigint(20) NOT NULL,
  `unit_id` bigint(20) NOT NULL,
  `current_stock` decimal(10,2) NOT NULL DEFAULT 0.00,
  `minimum_stock` decimal(10,2) NOT NULL DEFAULT 0.00,
  `maximum_stock` decimal(10,2) NOT NULL DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `items`
--

INSERT INTO `items` (`id`, `item_name`, `category_id`, `unit_id`, `current_stock`, `minimum_stock`, `maximum_stock`, `description`, `created_at`, `updated_at`) VALUES
(18, 'Espresso Beans', 1, 1, 17.80, 10.00, 100.00, 'Premium roasted espresso beans', '2025-10-01 14:01:19', '2025-10-10 09:43:59'),
(19, 'Ground Coffee Blend', 1, 1, 30.00, 5.00, 80.00, 'House blend ground coffee', '2025-10-01 14:01:19', '2025-10-01 14:01:19'),
(20, 'Whole Milk', 2, 2, 0.00, 5.00, 50.00, 'Fresh whole milk for lattes and cappuccinos', '2025-10-01 14:52:32', '2025-10-01 14:52:32'),
(21, 'Whipping Cream', 2, 2, 10.00, 2.00, 30.00, 'Cream for specialty drinks', '2025-10-01 14:52:32', '2025-10-01 14:52:32'),
(22, 'White Sugar', 3, 1, 3.00, 5.00, 60.00, 'Refined white sugar', '2025-10-01 14:52:32', '2025-10-01 14:52:32'),
(23, 'Brown Sugar', 3, 1, 5.00, 3.00, 40.00, 'Brown sugar for coffee and pastries', '2025-10-01 14:52:32', '2025-10-08 12:44:52'),
(24, 'Paper Cups (12oz)', 4, 3, 20.00, 50.00, 500.00, 'Takeaway paper cups', '2025-10-01 14:52:32', '2025-10-01 14:52:32'),
(25, 'Cup Lids (12oz)', 4, 3, 28.00, 50.00, 500.00, 'Lids for takeaway cups', '2025-10-01 14:52:32', '2025-10-10 09:43:38'),
(26, 'Vanilla Syrup', 5, 4, 0.00, 3.00, 30.00, 'Classic vanilla flavoring syrup', '2025-10-01 14:52:32', '2025-10-01 14:52:32'),
(27, 'Caramel Syrup', 5, 4, 3.00, 2.00, 25.00, 'Rich caramel syrup for drinks', '2025-10-01 14:52:32', '2025-10-08 13:04:25'),
(28, 'Espresso Machine Filter', 6, 3, 5.00, 1.00, 10.00, 'Spare filters for espresso machine', '2025-10-01 14:52:32', '2025-10-01 14:52:32'),
(29, 'Coffee Grinder Burr', 6, 3, 3.00, 1.00, 8.00, 'Replacement burr for coffee grinder', '2025-10-01 14:52:32', '2025-10-01 14:52:32'),
(30, 'Cocoa Powder', 7, 8, 8.00, 2.00, 20.00, 'Used for hot chocolate and mochas', '2025-10-01 14:52:32', '2025-10-01 14:52:32');

-- --------------------------------------------------------

--
-- Table structure for table `recipes`
--

CREATE TABLE `recipes` (
  `id` int(11) NOT NULL,
  `recipe_name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `recipes`
--

INSERT INTO `recipes` (`id`, `recipe_name`, `created_at`, `updated_at`) VALUES
(1, 'Caffe Latte', '2025-10-02 06:24:43', '2025-10-02 06:24:43'),
(2, 'Cappuccino', '2025-10-02 06:24:43', '2025-10-02 06:24:43'),
(3, 'Espresso', '2025-10-02 06:24:43', '2025-10-02 06:24:43'),
(4, 'Iced Coffee', '2025-10-02 06:24:43', '2025-10-02 06:24:43'),
(5, 'Mocha', '2025-10-02 06:24:43', '2025-10-02 06:24:43'),
(7, 'Test Recipe', '2025-10-10 11:35:08', '2025-10-10 11:35:08');

-- --------------------------------------------------------

--
-- Table structure for table `recipe_ingredients`
--

CREATE TABLE `recipe_ingredients` (
  `id` int(11) NOT NULL,
  `recipe_id` int(11) NOT NULL,
  `item_id` bigint(20) NOT NULL,
  `quantity_required` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `recipe_ingredients`
--

INSERT INTO `recipe_ingredients` (`id`, `recipe_id`, `item_id`, `quantity_required`, `created_at`, `updated_at`) VALUES
(3, 1, 18, 18.10, '2025-10-02 06:26:45', '2025-10-02 06:26:45'),
(4, 1, 20, 200.40, '2025-10-02 06:26:45', '2025-10-02 06:26:45'),
(5, 2, 18, 18.40, '2025-10-02 06:26:45', '2025-10-02 06:26:45'),
(6, 2, 20, 150.10, '2025-10-02 06:26:45', '2025-10-02 06:26:45'),
(7, 3, 18, 18.20, '2025-10-02 06:26:45', '2025-10-02 06:26:45'),
(8, 4, 18, 18.30, '2025-10-02 06:26:45', '2025-10-02 06:26:45'),
(9, 4, 20, 100.50, '2025-10-02 06:26:45', '2025-10-02 06:26:45'),
(10, 5, 18, 18.23, '2025-10-02 06:26:45', '2025-10-02 06:26:45'),
(11, 5, 20, 150.10, '2025-10-02 06:26:45', '2025-10-02 06:26:45'),
(12, 5, 30, 30.50, '2025-10-02 06:26:45', '2025-10-02 06:26:45'),
(14, 7, 25, 1.00, '2025-10-10 11:35:08', '2025-10-10 11:35:08');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `item_id` bigint(20) DEFAULT NULL,
  `recipe_id` int(11) DEFAULT NULL,
  `transaction_type` enum('usage','restock','adjustment','update','delete','added') NOT NULL,
  `quantity` decimal(10,2) DEFAULT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `item_id`, `recipe_id`, `transaction_type`, `quantity`, `user_id`, `notes`, `created_at`, `updated_at`) VALUES
(1, 18, NULL, 'update', 90.60, 1, 'Item updated. Old stock: 13.60, New stock: 90.6', '2025-10-04 11:33:14', '2025-10-04 11:33:14'),
(2, 18, 3, 'usage', 18.20, 1, 'Recipe usage: 1 serving(s)', '2025-10-04 11:33:29', '2025-10-04 11:33:29'),
(3, 18, 3, 'usage', 18.20, 3, 'Recipe usage: 1 serving(s)', '2025-10-04 11:33:46', '2025-10-04 11:33:46'),
(4, 23, NULL, 'usage', 10.00, 7, 'Manual usage entry', '2025-10-06 13:42:19', '2025-10-06 13:42:19'),
(5, 27, NULL, 'usage', 4.00, 7, 'Manual usage entry', '2025-10-06 13:42:19', '2025-10-06 13:42:19'),
(6, 18, 3, 'usage', 18.20, 7, 'Recipe usage: 1 serving(s)', '2025-10-08 12:44:27', '2025-10-08 12:44:27'),
(7, 23, NULL, 'usage', 5.00, 7, 'Manual usage entry', '2025-10-08 12:44:52', '2025-10-08 12:44:52'),
(8, 27, NULL, 'update', 20.00, 1, 'Item updated. Old stock: 16.00, New stock: 20', '2025-10-08 12:45:57', '2025-10-08 12:45:57'),
(9, 27, NULL, 'update', 5.00, 1, 'Item updated. Old stock: 20.00, New stock: 5', '2025-10-08 12:59:16', '2025-10-08 12:59:16'),
(10, 25, NULL, 'update', 30.00, 1, 'Item updated. Old stock: 180.00, New stock: 30', '2025-10-08 12:59:25', '2025-10-08 12:59:25'),
(11, 27, NULL, 'usage', 2.00, 2, 'Manual usage entry', '2025-10-08 13:04:25', '2025-10-08 13:04:25'),
(12, 25, NULL, 'usage', 2.00, 2, 'Manual usage entry', '2025-10-10 09:43:38', '2025-10-10 09:43:38'),
(13, 18, 3, 'usage', 18.20, 2, 'Recipe usage: 1 serving(s)', '2025-10-10 09:43:59', '2025-10-10 09:43:59'),
(14, NULL, NULL, 'added', 24.00, 1, 'New item \"Test\" added to inventory', '2025-10-10 11:34:47', '2025-10-10 11:34:47'),
(15, NULL, 7, 'added', NULL, 1, 'Recipe \"Test Recipe\" created with 2 ingredient(s)', '2025-10-10 11:35:08', '2025-10-10 11:35:08'),
(16, NULL, NULL, 'update', 24.00, 1, 'Item updated. Old stock: 24.00, New stock: 24.00', '2025-10-10 11:36:57', '2025-10-10 11:36:57'),
(17, NULL, NULL, 'update', 24.00, 1, 'Item updated. Old stock: 24.00, New stock: 24.00', '2025-10-10 11:36:57', '2025-10-10 11:36:57'),
(18, NULL, NULL, 'update', 24.00, 1, 'Item updated. Old stock: 24.00, New stock: 24.00', '2025-10-10 11:37:08', '2025-10-10 11:37:08'),
(19, NULL, NULL, 'delete', 24.00, 1, 'Item \"Update Test\" deleted from inventory', '2025-10-10 11:37:43', '2025-10-10 11:37:43');

-- --------------------------------------------------------

--
-- Table structure for table `units`
--

CREATE TABLE `units` (
  `id` bigint(20) NOT NULL,
  `name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `units`
--

INSERT INTO `units` (`id`, `name`) VALUES
(6, 'bags'),
(4, 'bottles'),
(5, 'boxes'),
(8, 'g'),
(1, 'kg'),
(2, 'L'),
(7, 'ml'),
(3, 'pcs');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('manager','barista') NOT NULL DEFAULT 'barista',
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `remember_token`, `created_at`, `updated_at`, `last_login`) VALUES
(1, 'manager', '$2b$10$Olv69dF2TM2yeIW1ghDgpeaBMGgeJ54Bq/Maj0YP1HwnuNRcjn2Ee', 'manager', NULL, '2025-10-01 08:26:40', '2025-10-10 15:20:05', '2025-10-10 15:20:05'),
(2, 'Raymund', '$2b$10$I.bIqJAlknd2GL8X3U.7qu69UbtIhrLPwYE6rGX.m/MBT7tNqsZ3.', 'barista', NULL, '2025-10-01 08:27:28', '2025-10-10 15:19:25', '2025-10-10 15:19:25'),
(3, 'john', '$2b$10$lpaFhbuLVyxWW8bDMiA9EOnV5ZpbuMgPLuFAjVrlhMQxVJCEw1ecO', 'barista', NULL, '2025-10-01 11:54:20', '2025-10-04 12:21:11', NULL),
(4, 'test2', '$2b$10$bzy52RtKWqdkjlj70QK5out6Z6vRpClFk1MvWgiMwUgELXZP8.d7W', 'barista', NULL, '2025-10-01 13:03:50', '2025-10-01 13:03:50', NULL),
(5, 'test4', '$2b$10$wuQpY2.SF0QgYt1UsDvPWOPQgpWf3Dz2m7cnumrZcjASB1Caq3PRi', 'barista', NULL, '2025-10-01 13:04:12', '2025-10-01 13:04:12', NULL),
(6, 'bruh', '$2b$10$A9GN5HjK5AUS3iTON6zmm.eZ1iExw6FmBpTbWUUMIEQG8HNlNu4SK', 'barista', NULL, '2025-10-01 14:44:10', '2025-10-01 14:44:10', NULL),
(7, 'aaron', '$2b$10$JOos3.0xYsC4zbjSpBJpeunNuwxYjPRPGUX2S0esYSJvPr3GbQxTm', 'barista', NULL, '2025-10-01 14:51:48', '2025-10-06 13:41:58', NULL),
(8, 'ad', '$2b$10$Rv5rQLBsZKGQUQwN.SzJMu0vG/NqGf9Bv.lUp824WlfUZbshAl07G', 'barista', NULL, '2025-10-08 11:31:42', '2025-10-08 11:31:42', NULL),
(9, 'faf', '$2b$10$rcbHXsAnv0Q/HnMvaZCNNOdz5o.ohK8.r6TR6yZxlZr9bc0YqQPN6', 'barista', NULL, '2025-10-08 11:32:40', '2025-10-08 11:32:40', NULL),
(10, 'dada', '$2b$10$Bx3P8V6ioYwO4vaa0TBX6eZBDHsqa6nwNcpipyXY1fuDQlDkXxiji', 'barista', NULL, '2025-10-08 11:33:25', '2025-10-08 11:33:25', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_items_category` (`category_id`),
  ADD KEY `fk_items_unit` (`unit_id`);

--
-- Indexes for table `recipes`
--
ALTER TABLE `recipes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `recipe_name` (`recipe_name`),
  ADD KEY `idx_recipe_name` (`recipe_name`);

--
-- Indexes for table `recipe_ingredients`
--
ALTER TABLE `recipe_ingredients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_recipe_item` (`recipe_id`,`item_id`),
  ADD KEY `idx_recipe_id` (`recipe_id`),
  ADD KEY `idx_item_id` (`item_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_transactions_item` (`item_id`),
  ADD KEY `fk_transactions_user` (`user_id`),
  ADD KEY `fk_transactions_recipe` (`recipe_id`);

--
-- Indexes for table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `items`
--
ALTER TABLE `items`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `recipes`
--
ALTER TABLE `recipes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `recipe_ingredients`
--
ALTER TABLE `recipe_ingredients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `units`
--
ALTER TABLE `units`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `items`
--
ALTER TABLE `items`
  ADD CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_items_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `recipe_ingredients`
--
ALTER TABLE `recipe_ingredients`
  ADD CONSTRAINT `recipe_ingredients_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `recipe_ingredients_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_transactions_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
