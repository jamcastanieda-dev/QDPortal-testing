-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 03, 2025 at 04:26 AM
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
(1, 'external', '1st Sem – 2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-02 07:41:03', 'Non-conformance', 'description of findings', '[\"http://localhost/qdportal-testing/rcpa/uploads/req_68b62f105512c4.40659140/testing_qdportal_8_.sql\"]', 'std', 'standard', 'Sandy Vito', 'QA', 'CLOSED (VALID)', '2025-09-02', 0, '2025-09-02', '2025-08-27', 'hit', 2, '2025-09-02', '2025-10-22', 'hit'),
(2, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-02 08:47:52', 'Non-conformance', 'description of findings', '[\"http://localhost/qdportal-testing/rcpa/uploads/req_68b63eb9027448.02523654/testing_qdportal_8_.sql\"]', 'stsd', 'clause', 'Sandy Vito', 'QA', 'CLOSED (IN-VALID)', '2025-09-02', 0, '2025-09-02', '2025-09-17', 'hit', NULL, NULL, '2025-10-22', NULL),
(3, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-02 15:22:00', 'Non-conformance', 'description of findings nga ni', '[\"http://localhost/qdportal-testing/rcpa/uploads/req_68b69b193d85e1.26504623/rcpa_not_working_calendar_2_.sql\"]', 'std nga ni', 'standar clause nga ni', 'Sandy Vito', 'QA', 'CLOSED (VALID)', '2025-09-02', 0, '2025-09-02', '2025-09-23', 'hit', 0, '2025-09-03', '2025-10-28', 'hit'),
(4, 'mgmt', '2025', NULL, NULL, 'Q3', 'Observation', 'Razell Ramos-Victolero', 'QMS', '2025-09-03 10:04:37', 'Potential Non-conformance', 'description of findings nga ito', '[\"http://localhost/qdportal-testing/rcpa/uploads/req_68b7a23685ca85.16366530/rcpa_evidence_checking_remarks__1_.sql\"]', 'std', 'standard clause number', 'Sandy Vito', 'QA', 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

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
  MODIFY `id` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
