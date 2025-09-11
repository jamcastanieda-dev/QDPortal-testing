-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 10, 2025 at 02:30 PM
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
-- Database: `testing_qdportal`
--

-- --------------------------------------------------------

--
-- Table structure for table `rcpa_invalidation_reply_remarks`
--

CREATE TABLE `rcpa_invalidation_reply_remarks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `rcpa_no` varchar(64) NOT NULL,
  `type` varchar(99) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `attachment` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rcpa_invalidation_reply_remarks`
--

INSERT INTO `rcpa_invalidation_reply_remarks` (`id`, `rcpa_no`, `type`, `remarks`, `attachment`, `created_at`) VALUES
(1, '23', NULL, 'remarks for invalidation', '[{\"name\":\"GAGAWIN-LIST-DOCX.docx\",\"url\":\"/qdportal-testing/rcpa/uploads-rcpa-invalidation-reply/20250910-200218/GAGAWIN-LIST-DOCX.docx\",\"size\":241224,\"bytes\":241224}]', '2025-09-10 20:02:18'),
(2, '9', 'Approved by QA Manager in in-validation reply approval', 'awd', NULL, '2025-09-10 20:19:24');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `rcpa_invalidation_reply_remarks`
--
ALTER TABLE `rcpa_invalidation_reply_remarks`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `rcpa_invalidation_reply_remarks`
--
ALTER TABLE `rcpa_invalidation_reply_remarks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
