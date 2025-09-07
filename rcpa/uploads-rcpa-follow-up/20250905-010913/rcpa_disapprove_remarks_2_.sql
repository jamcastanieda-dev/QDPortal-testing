-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 04, 2025 at 09:46 AM
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
-- Table structure for table `rcpa_disapprove_remarks`
--

CREATE TABLE `rcpa_disapprove_remarks` (
  `id` int(10) UNSIGNED NOT NULL,
  `rcpa_no` int(10) UNSIGNED NOT NULL,
  `disapprove_type` varchar(255) DEFAULT NULL,
  `remarks` text NOT NULL,
  `attachments` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rcpa_disapprove_remarks`
--

INSERT INTO `rcpa_disapprove_remarks` (`id`, `rcpa_no`, `disapprove_type`, `remarks`, `attachments`, `created_at`) VALUES
(1, 5, 'Disapproved by Assignee Supervisor/Manager in in-valid approval', 'dawdaw', NULL, '2025-09-03 15:00:32'),
(2, 6, 'Disapproved by QMS/QA in invalidation reply', 'daw', NULL, '2025-09-04 14:05:40'),
(3, 1, 'Disapproved by QMS/QA in checking', 'dwa', NULL, '2025-09-04 14:05:48'),
(4, 9, 'Disapproved by QMS/QA in validation reply', 'DAWSDAW', NULL, '2025-09-04 14:06:56'),
(5, 12, 'Disapproved by QA/QMS Team in Corrective Checking', 'dasdaw', NULL, '2025-09-04 14:14:26'),
(6, 16, 'Disapproved by QMS/QA in invalidation reply', 'ADASW', NULL, '2025-09-04 14:15:42'),
(7, 16, 'Disapproved by QMS/QA in validation reply', 'ADWASDW', NULL, '2025-09-04 14:16:09'),
(8, 16, 'Disapproved by QMS/QA in checking', 'AWD', NULL, '2025-09-04 14:17:23'),
(9, 16, 'Disapproved by QMS/QA in checking', 'ASDAW', NULL, '2025-09-04 14:18:12'),
(10, 16, 'Disapproved by Assignee in Assignee Corrective', 'adsdwa', NULL, '2025-09-04 14:36:15'),
(11, 16, 'Disapproved by Assignee Supervisor/Manager in valid approval', 'sadaw', NULL, '2025-09-04 14:45:53'),
(12, 4, 'Disapproved by Assignee Supervisor/Manager in in-valid approval', 'asdaw', NULL, '2025-09-04 14:45:59');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `rcpa_disapprove_remarks`
--
ALTER TABLE `rcpa_disapprove_remarks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rcpa_id` (`rcpa_no`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `rcpa_disapprove_remarks`
--
ALTER TABLE `rcpa_disapprove_remarks`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
