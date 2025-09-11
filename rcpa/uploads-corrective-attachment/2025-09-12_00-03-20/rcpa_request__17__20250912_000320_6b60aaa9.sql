-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 10, 2025 at 05:24 PM
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
  `section` varchar(55) DEFAULT NULL,
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

INSERT INTO `rcpa_request` (`id`, `rcpa_type`, `sem_year`, `project_name`, `wbs_number`, `quarter`, `category`, `originator_name`, `originator_department`, `date_request`, `conformance`, `remarks`, `remarks_attachment`, `system_applicable_std_violated`, `standard_clause_number`, `originator_supervisor_head`, `assignee`, `section`, `status`, `reply_received`, `no_days_reply`, `reply_date`, `reply_due_date`, `hit_reply`, `no_days_close`, `close_date`, `close_due_date`, `hit_close`) VALUES
(1, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-06 13:21:37', 'Non-conformance', 'description of findings', '[\"http://localhost/qdportal-testing/rcpa/uploads/req_68bbc4e21c2871.04964796/system_users_5_.sql\"]', 'std', 'standard Clause Number(s)', 'Sandy Vito', 'QA', NULL, 'CLOSED (VALID)', '2025-09-06', 0, '2025-09-06', '2025-09-12', 'hit', 0, '2025-09-06', '2025-10-17', 'hit'),
(2, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-07 13:47:39', 'Non-conformance', 'awdadaw', NULL, 'awdawdaw', 'daw', 'Sandy Vito', 'QA', NULL, 'FOR CLOSING APPROVAL', '2025-09-07', 0, '2025-09-08', '2025-09-17', 'hit', NULL, NULL, '2025-10-22', NULL),
(3, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-07 20:15:06', 'Non-conformance', 'asdawdas', NULL, 'dawdas', 'dawda', 'Sandy Vito', 'SSD', 'DESIGN', 'CLOSED (VALID)', '2025-09-07', 0, '2025-09-07', '2025-09-15', 'hit', 0, '2025-09-07', '2025-10-20', 'hit'),
(4, 'internal', '1st Sem – 2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-07 20:33:27', 'Non-conformance', 'dawdwa', NULL, 'dawawd', 'awd', 'Amer Cruz', 'SSD', NULL, 'FOR APPROVAL OF SUPERVISOR', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-07 21:21:00', 'Non-conformance', 'asdawd', NULL, 'awdaw', 'dawdaw', 'Sandy Vito', 'SSD', 'DESIGN', 'CLOSED (IN-VALID)', '2025-09-07', 0, '2025-09-07', '2025-09-15', 'hit', 0, '2025-09-07', '2025-10-20', 'hit'),
(6, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-08 10:35:36', 'Non-conformance', 'findingsDAWWD', '[\"http://localhost/qdportal-testing/rcpa/uploads/req_68be40f8bbb4e5.66137578/rcpa_request_13_.sql\"]', 'STDDAWDAW', 'CLAUSEDAW', 'Sandy Vito', 'SSD', 'PRODUCTION', 'CLOSED (VALID)', '2025-09-08', 0, '2025-09-08', '2025-09-15', 'hit', 0, '2025-09-08', '2025-10-20', 'hit'),
(7, 'online', '2025', NULL, NULL, NULL, 'Minor', 'Razell Ramos-Victolero', 'QMS', '2025-09-08 11:21:59', 'Non-conformance', 'daw', NULL, 'adwdaw', 'dawdaw', 'Sandy Vito', 'QA', NULL, 'CLOSED (VALID)', '2025-09-08', 0, '2025-09-08', '2025-09-17', 'hit', 0, '2025-09-08', '2025-10-22', 'hit'),
(8, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-08 14:21:13', 'Non-conformance', 'asdawda', NULL, 'dawdawda', 'wdawdaw', 'Sandy Vito', 'SSD', 'PRODUCTION', 'VALID APPROVAL', '2025-09-08', NULL, NULL, '2025-09-15', NULL, NULL, NULL, '2025-10-20', NULL),
(9, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-08 15:07:44', 'Non-conformance', 'adawd', NULL, 'aw', 'dwada', 'Sandy Vito', 'SSD', 'PRODUCTION', 'QMS CHECKING', '2025-09-08', 0, '2025-09-08', '2025-09-17', 'hit', NULL, NULL, '2025-10-22', NULL),
(10, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-08 16:25:24', 'Non-conformance', 'wahahhaahahah', NULL, 'ahahahah', 'hahahahah', 'Sandy Vito', 'SSD', 'PRODUCTION', 'CLOSED (VALID)', '2025-09-08', 0, '2025-09-08', '2025-09-17', 'hit', 0, '2025-09-08', '2025-10-22', 'hit'),
(11, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 18:53:51', 'Non-conformance', 'dawdasdw', NULL, 'std', 'standard clause', 'Sandy Vito', 'QA', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(12, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 18:54:16', 'Non-conformance', 'asdaw', NULL, 'std', 'sa', 'Sandy Vito', 'QA', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(13, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 18:58:29', 'Non-conformance', 'lkui', NULL, 'sssss', 'ss', 'Sandy Vito', 'QA', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(14, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 19:05:44', 'Non-conformance', 'cadwasdwa', NULL, 'sadawdaw', 'awdawda', 'Sandy Vito', 'QA', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(15, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 19:06:51', 'Non-conformance', 'sawdasdwa', NULL, 'std', 'standard cluase number', 'Sandy Vito', 'QA', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(16, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 19:08:08', 'Non-conformance', 'asdawd', NULL, 'std', 'sdawd', 'Sandy Vito', 'QA', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(17, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 19:15:57', 'Non-conformance', 'asdawd', NULL, 'std', 'standard cluase', 'Sandy Vito', 'QA', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(18, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 19:17:23', 'Non-conformance', 'dawdas', NULL, 'td', 'clause', 'Sandy Vito', 'QA', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(19, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 19:18:01', 'Non-conformance', 'description of findings', NULL, 'std', 'clause', 'Sandy Vito', 'QA', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(20, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 19:18:52', 'Non-conformance', 'description of findings', NULL, 'std', 'standard', 'Sandy Vito', 'QA', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(21, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 21:11:47', 'Non-conformance', 'asdawdasdawd', NULL, 'adawdaw', 'dawdawd', 'Sandy Vito', 'QA', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(22, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 21:12:14', 'Non-conformance', 'sadawda', NULL, 'sa', 'asdawd', 'Sandy Vito', 'PID', NULL, 'IN-VALIDATION REPLY', '2025-09-09', 0, '2025-09-09', '2025-09-13', 'hit', NULL, NULL, '2025-10-22', NULL),
(23, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-09 22:19:47', 'Non-conformance', 'asdawdasd', NULL, 'std', 'sadw', 'Sandy Vito', 'PID', NULL, 'IN-VALID APPROVAL - ORIGINATOR', '2025-09-09', 0, '2025-09-09', '2025-09-17', 'hit', NULL, NULL, '2025-10-22', NULL),
(24, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-10 01:22:13', 'Non-conformance', 'asdawd', NULL, 'std', 'standard cluase', 'Sandy Vito', 'PID', NULL, 'CLOSED (IN-VALID)', '2025-09-10', 0, '2025-09-10', '2025-09-13', 'hit', 0, '2025-09-10', '2025-09-17', 'hit'),
(25, 'online', '2025', NULL, NULL, NULL, 'Observation', 'Razell Ramos-Victolero', 'QMS', '2025-09-10 05:42:05', 'Potential Non-conformance', 'sadaw', NULL, 'sdawd', 'awdawd', 'Sandy Vito', 'PID', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(26, 'online', '2025', NULL, NULL, NULL, 'Major', 'Razell Ramos-Victolero', 'QMS', '2025-09-10 22:54:20', 'Non-conformance', 'dasdawd', NULL, 'std', 'asdaw', 'Sandy Vito', 'QA', NULL, 'FOR APPROVAL OF MANAGER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

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
  MODIFY `id` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
