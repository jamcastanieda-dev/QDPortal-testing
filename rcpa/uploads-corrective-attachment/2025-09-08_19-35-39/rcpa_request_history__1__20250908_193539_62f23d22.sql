-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 08, 2025 at 10:23 AM
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
-- Table structure for table `rcpa_request_history`
--

CREATE TABLE `rcpa_request_history` (
  `id` int(11) NOT NULL,
  `rcpa_no` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `date_time` datetime NOT NULL DEFAULT current_timestamp(),
  `activity` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rcpa_request_history`
--

INSERT INTO `rcpa_request_history` (`id`, `rcpa_no`, `name`, `date_time`, `activity`) VALUES
(1, '1', 'Razell Ramos-Victolero', '2025-09-06 13:21:38', 'RCPA has been requested.'),
(2, '1', 'Sandy Vito', '2025-09-06 13:21:47', 'RCPA has been approved'),
(3, '1', 'Sandy Vito', '2025-09-06 13:21:52', 'RCPA has been checked by QMS/QA'),
(4, '1', 'Sandy Vito', '2025-09-06 13:22:51', 'The Assignee confirmed that the RCPA is valid.'),
(5, '1', 'Sandy Vito', '2025-09-06 13:22:58', 'The Assignee Supervisor/Manager approved the Assignee reply as VALID'),
(6, '1', 'Sandy Vito', '2025-09-06 13:23:05', 'The valid reply by Assignee was approved by QA/QMS'),
(7, '1', 'Razell Ramos-Victolero', '2025-09-06 13:23:19', 'The Originator disapproved the validation reply'),
(8, '1', 'Sandy Vito', '2025-09-06 13:23:24', 'The valid reply by Assignee was approved by QA/QMS'),
(9, '1', 'Razell Ramos-Victolero', '2025-09-06 13:23:30', 'The Originator approved the valid reply'),
(10, '1', 'Sandy Vito', '2025-09-06 13:23:39', 'The Assignee request approval for corrective action evidence'),
(11, '1', 'Sandy Vito', '2025-09-06 13:23:47', 'The Assignee Supervisor/Manager approved the Assignee corrective action evidence approval'),
(12, '1', 'Sandy Vito', '2025-09-06 13:24:07', 'The QMS/QA accepted the corrective reply for evidence checking'),
(13, '1', 'Razell Ramos-Victolero', '2025-09-06 13:24:17', 'Originator approved the corrective evidence'),
(14, '1', 'Sandy Vito', '2025-09-06 13:24:31', 'Final approval given. Request CLOSED (VALID).'),
(15, '2', 'Razell Ramos-Victolero', '2025-09-07 13:47:39', 'RCPA has been requested.'),
(16, '2', 'Sandy Vito', '2025-09-07 13:47:44', 'RCPA has been approved'),
(17, '2', 'Sandy Vito', '2025-09-07 13:48:45', 'RCPA has been checked by QMS/QA'),
(18, '3', 'Razell Ramos-Victolero', '2025-09-07 20:15:07', 'RCPA has been requested.'),
(19, '4', 'Razell Ramos-Victolero', '2025-09-07 20:33:27', 'RCPA has been requested.'),
(20, '3', 'Sandy Vito', '2025-09-07 20:37:24', 'RCPA has been approved'),
(21, '3', 'Sandy Vito', '2025-09-07 20:41:30', 'RCPA has been checked by QMS/QA'),
(22, '3', 'Nerissa Tomas', '2025-09-07 20:53:40', 'The Assignee confirmed that the RCPA is valid.'),
(23, '3', 'Nerissa Tomas', '2025-09-07 20:58:28', 'The Assignee Supervisor/Manager approved the Assignee reply as VALID'),
(24, '3', 'Sandy Vito', '2025-09-07 21:01:57', 'The valid reply by Assignee was approved by QA/QMS'),
(25, '3', 'Razell Ramos-Victolero', '2025-09-07 21:04:52', 'The Originator approved the valid reply'),
(26, '3', 'Sandy Vito', '2025-09-07 21:08:04', 'The Assignee request approval for corrective action evidence'),
(27, '3', 'Sandy Vito', '2025-09-07 21:11:05', 'The Assignee Supervisor/Manager approved the Assignee corrective action evidence approval'),
(28, '3', 'Sandy Vito', '2025-09-07 21:13:32', 'The QMS/QA accepted the corrective reply for evidence checking'),
(29, '3', 'Razell Ramos-Victolero', '2025-09-07 21:13:44', 'Originator approved the corrective evidence'),
(30, '3', 'Sandy Vito', '2025-09-07 21:16:41', 'Final approval given. Request CLOSED (VALID).'),
(31, '5', 'Razell Ramos-Victolero', '2025-09-07 21:21:00', 'RCPA has been requested.'),
(32, '5', 'Sandy Vito', '2025-09-07 21:21:08', 'RCPA has been approved'),
(33, '5', 'Sandy Vito', '2025-09-07 21:21:20', 'RCPA has been checked by QMS/QA'),
(34, '5', 'Nerissa Tomas', '2025-09-07 21:21:32', 'The Assignee confirmed that the RCPA is not valid'),
(35, '5', 'Nerissa Tomas', '2025-09-07 21:26:20', 'The Assignee Supervisor/Manager approved the Assignee reply as IN-VALID'),
(36, '5', 'Sandy Vito', '2025-09-07 21:31:26', 'The in-validation reply by Assignee was approved by QA/QMS team'),
(37, '5', 'Sandy Vito', '2025-09-07 21:34:24', 'The in-validation reply approval by QA/QMS Team was approved by QA/QMS Supervisor/Manager'),
(38, '5', 'Razell Ramos-Victolero', '2025-09-07 21:34:35', 'Originator approved that the RCPA is CLOSED (IN-VALID)'),
(39, '6', 'Razell Ramos-Victolero', '2025-09-08 10:35:36', 'RCPA has been requested.'),
(40, '6', 'Sandy Vito', '2025-09-08 10:36:29', 'RCPA has been approved'),
(41, '6', 'Sandy Vito', '2025-09-08 10:39:29', 'RCPA has been checked by QMS/QA'),
(42, '6', 'Nerissa Tomas', '2025-09-08 10:56:17', 'The Assignee confirmed that the RCPA is valid.'),
(43, '6', 'Nerissa Tomas', '2025-09-08 10:58:20', 'The Assignee Supervisor/Manager approved the Assignee reply as VALID'),
(44, '6', 'Sandy Vito', '2025-09-08 11:00:58', 'The valid reply by Assignee was approved by QA/QMS'),
(45, '6', 'Razell Ramos-Victolero', '2025-09-08 11:05:07', 'The Originator approved the valid reply'),
(46, '6', 'Nerissa Tomas', '2025-09-08 11:11:26', 'The Assignee request approval for corrective action evidence'),
(47, '6', 'Nerissa Tomas', '2025-09-08 11:13:35', 'The Assignee Supervisor/Manager approved the Assignee corrective action evidence approval'),
(48, '6', 'Sandy Vito', '2025-09-08 11:16:40', 'The QMS/QA accepted the corrective reply for evidence checking'),
(49, '6', 'Razell Ramos-Victolero', '2025-09-08 11:17:30', 'Originator approved the corrective evidence'),
(50, '6', 'Sandy Vito', '2025-09-08 11:17:47', 'Final approval given. Request CLOSED (VALID).'),
(51, '7', 'Razell Ramos-Victolero', '2025-09-08 11:22:00', 'RCPA has been requested.'),
(52, '7', 'Sandy Vito', '2025-09-08 11:22:08', 'RCPA has been approved'),
(53, '7', 'Sandy Vito', '2025-09-08 11:22:14', 'RCPA has been checked by QMS/QA'),
(54, '8', 'Razell Ramos-Victolero', '2025-09-08 14:21:14', 'RCPA has been requested.'),
(55, '8', 'Sandy Vito', '2025-09-08 14:21:31', 'RCPA has been approved'),
(56, '8', 'Sandy Vito', '2025-09-08 14:21:39', 'RCPA has been checked by QMS/QA'),
(57, '8', 'Nerissa Tomas', '2025-09-08 14:58:17', 'The Assignee confirmed that the RCPA is valid.'),
(58, '9', 'Razell Ramos-Victolero', '2025-09-08 15:07:45', 'RCPA has been requested.'),
(59, '9', 'Sandy Vito', '2025-09-08 15:07:50', 'RCPA has been approved'),
(60, '9', 'Sandy Vito', '2025-09-08 15:07:58', 'RCPA has been checked by QMS/QA'),
(61, '9', 'Nerissa Tomas', '2025-09-08 15:08:38', 'The Assignee confirmed that the RCPA is valid.'),
(62, '9', 'Nerissa Tomas', '2025-09-08 15:08:48', 'The valid approval by Assignee was disapproved by Assignee Supervisor/Manager'),
(63, '9', 'Nerissa Tomas', '2025-09-08 15:08:58', 'The Assignee confirmed that the RCPA is not valid'),
(64, '9', 'Nerissa Tomas', '2025-09-08 16:17:56', 'The Assignee Supervisor/Manager approved the Assignee reply as IN-VALID'),
(65, '9', 'Sandy Vito', '2025-09-08 16:18:05', 'The in-validation reply by Assignee was approved by QA/QMS team');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `rcpa_request_history`
--
ALTER TABLE `rcpa_request_history`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `rcpa_request_history`
--
ALTER TABLE `rcpa_request_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=66;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
