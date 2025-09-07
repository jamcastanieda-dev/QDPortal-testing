-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 02, 2025 at 11:18 AM
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
-- Table structure for table `rcpa_evidence_checking_remarks`
--

CREATE TABLE `rcpa_evidence_checking_remarks` (
  `id` int(10) UNSIGNED NOT NULL,
  `rcpa_no` varchar(32) NOT NULL,
  `action_done` varchar(8) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `attachment` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachment`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rcpa_evidence_checking_remarks`
--

INSERT INTO `rcpa_evidence_checking_remarks` (`id`, `rcpa_no`, `action_done`, `remarks`, `attachment`) VALUES
(1, '3', NULL, 'dw', '[]'),
(2, '3', 'yes', 'dawljdaw;djawdljbwad;awojb', '[{\"name\":\"rcpa_not_working_calendar (2).sql\",\"url\":\"/qdportal-testing/rcpa/uploads-rcpa-evidence-checking/20250902105515_522d35e6/rcpa_not_working_calendar%20_2_.sql\",\"size\":2024},{\"name\":\"rcpa_request (9).sql\",\"url\":\"/qdportal-testing/rcpa/uploads-rcpa-evidence-checking/20250902105515_522d35e6/rcpa_request%20_9_.sql\",\"size\":3780},{\"name\":\"rcpa_not_valid (2).sql\",\"url\":\"/qdportal-testing/rcpa/uploads-rcpa-evidence-checking/20250902105515_522d35e6/rcpa_not_valid%20_2_.sql\",\"size\":2253}]'),
(3, '3', 'yes', 'DAWSDAW', '[]');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `rcpa_evidence_checking_remarks`
--
ALTER TABLE `rcpa_evidence_checking_remarks`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `rcpa_evidence_checking_remarks`
--
ALTER TABLE `rcpa_evidence_checking_remarks`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
