-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 07, 2025 at 01:17 PM
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
-- Table structure for table `rcpa_request`
--

CREATE TABLE `rcpa_request` (
  `id` int(10) NOT NULL,
  `rcpa_type` varchar(255) DEFAULT NULL,
  `sem_year` varchar(255) DEFAULT NULL,
  `project_name` varchar(255) DEFAULT NULL,
  `wbs_number` varchar(255) DEFAULT NULL,
  `quarter` varchar(255) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `originator_name` varchar(255) DEFAULT NULL,
  `originator_department` varchar(255) DEFAULT NULL,
  `date_request` datetime DEFAULT NULL,
  `conformance` varchar(255) DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `remarks_attachment` text DEFAULT NULL,
  `system_applicable_std_violated` varchar(255) DEFAULT NULL,
  `standard_clause_number` varchar(255) DEFAULT NULL,
  `originator_supervisor_head` varchar(255) DEFAULT NULL,
  `assignee` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'QMS CHECKING',
  `reply_received` date DEFAULT NULL,
  `no_days_reply` int(11) DEFAULT NULL,
  `reply_date` date DEFAULT NULL,
  `reply_due_date` date DEFAULT NULL,
  `hit_reply` varchar(10) DEFAULT NULL,
  `no_days_close` int(11) DEFAULT NULL,
  `close_date` date DEFAULT NULL,
  `close_due_date` date DEFAULT NULL,
  `hit_close` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rcpa_request`
--

INSERT INTO `rcpa_request` (`id`, `rcpa_type`, `sem_year`, `project_name`, `wbs_number`, `quarter`, `category`, `originator_name`, `originator_department`, `date_request`, `conformance`, `remarks`, `remarks_attachment`, `system_applicable_std_violated`, `standard_clause_number`, `originator_supervisor_head`, `assignee`, `status`, `reply_received`, `no_days_reply`, `reply_date`, `reply_due_date`, `hit_reply`, `no_days_close`, `close_date`, `close_due_date`, `hit_close`) VALUES
(1, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-06 13:21:37', 'Non-conformance', 'description of findings', '[\"http://localhost/qdportal-testing/rcpa/uploads/req_68bbc4e21c2871.04964796/system_users_5_.sql\"]', 'std', 'standard Clause Number(s)', 'Sandy Vito', 'QA', 'CLOSED (VALID)', '2025-09-06', 0, '2025-09-06', '2025-09-12', 'hit', 0, '2025-09-06', '2025-10-17', 'hit'),
(2, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-07 13:47:39', 'Non-conformance', 'awdadaw', NULL, 'awdawdaw', 'daw', 'Sandy Vito', 'QA', 'ASSIGNEE PENDING', '2025-09-07', NULL, NULL, '2025-09-15', NULL, NULL, NULL, '2025-10-20', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `rcpa_request`
--
ALTER TABLE `rcpa_request`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `rcpa_request`
--
ALTER TABLE `rcpa_request`
  MODIFY `id` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
