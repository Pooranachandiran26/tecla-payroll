-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: tecla_payroll
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `auditable_type` varchar(255) DEFAULT NULL,
  `auditable_id` bigint(20) unsigned DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id_foreign` (`user_id`),
  KEY `audit_logs_auditable_type_auditable_id_index` (`auditable_type`,`auditable_id`),
  CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,64,'otp.sent',NULL,NULL,NULL,'{\"masked_email\":\"adm***********\"}',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 07:51:35','2026-07-06 07:51:35'),(2,64,'otp_generated',NULL,NULL,NULL,'{\"purpose\":\"login\"}',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 07:51:35','2026-07-06 07:51:35'),(3,64,'otp.sent',NULL,NULL,NULL,'{\"masked_email\":\"mav*******************\"}',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 07:53:02','2026-07-06 07:53:02'),(4,64,'otp_generated',NULL,NULL,NULL,'{\"purpose\":\"login\"}',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 07:53:02','2026-07-06 07:53:02'),(5,64,'login',NULL,NULL,NULL,NULL,NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 07:55:51','2026-07-06 07:55:51'),(6,64,'email.settings_updated',NULL,NULL,NULL,'{\"changes\":[{\"key\":\"smtp_host\",\"old_value\":null,\"new_value\":\"smtp.gmail.com\"},{\"key\":\"smtp_port\",\"old_value\":587,\"new_value\":\"587\"},{\"key\":\"smtp_username\",\"old_value\":\"\",\"new_value\":\"nithidharan24@gmail.com\"},{\"key\":\"smtp_password\",\"old_value\":\"[changed]\",\"new_value\":\"[changed]\"},{\"key\":\"from_address\",\"old_value\":null,\"new_value\":\"nithidharan24@gmail.com\"},{\"key\":\"from_name\",\"old_value\":null,\"new_value\":\"TECLA_PAYROLL\"}]}',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 08:00:22','2026-07-06 08:00:22'),(7,64,'settings_updated',NULL,NULL,NULL,'{\"changes\":[{\"key\":\"otp_enabled\",\"old_value\":true,\"new_value\":false,\"reason\":\"DEVWEWEFWEFWEFWEF\"}]}',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 08:00:46','2026-07-06 08:00:46'),(8,64,'settings_updated',NULL,NULL,NULL,'{\"changes\":[{\"key\":\"otp_enabled\",\"old_value\":false,\"new_value\":true,\"reason\":\"EFEWFWFWEFWEFWEFWFEWF\"}]}',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 08:00:56','2026-07-06 08:00:56'),(9,64,'logout',NULL,NULL,NULL,NULL,NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 08:01:00','2026-07-06 08:01:00'),(10,64,'otp.sent',NULL,NULL,NULL,'{\"masked_email\":\"mav*******************\"}',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 08:01:17','2026-07-06 08:01:17'),(11,64,'otp_generated',NULL,NULL,NULL,'{\"purpose\":\"login\"}',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 08:01:17','2026-07-06 08:01:17'),(12,64,'otp.sent',NULL,NULL,NULL,'{\"masked_email\":\"mav*******************\"}',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 08:02:20','2026-07-06 08:02:20'),(13,64,'otp_generated',NULL,NULL,NULL,'{\"purpose\":\"login\"}',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 08:02:20','2026-07-06 08:02:20'),(14,64,'login',NULL,NULL,NULL,NULL,NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 08:03:57','2026-07-06 08:03:57'),(15,64,'settings_updated',NULL,NULL,NULL,'{\"changes\":[{\"key\":\"otp_enabled\",\"old_value\":true,\"new_value\":false,\"reason\":\"SDVSWEVWVEWVWE\"}]}',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 08:04:40','2026-07-06 08:04:40'),(16,64,'login',NULL,NULL,NULL,NULL,NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-07-06 23:07:41','2026-07-06 23:07:41');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_change_requests`
--

DROP TABLE IF EXISTS `bank_change_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bank_change_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_change_requests`
--

LOCK TABLES `bank_change_requests` WRITE;
/*!40000 ALTER TABLE `bank_change_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_change_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
INSERT INTO `cache` VALUES ('laravel-cache-5c785c036466adea360111aa28563bfd556b5fba','i:1;',1783399120),('laravel-cache-5c785c036466adea360111aa28563bfd556b5fba:timer','i:1783399120;',1783399120),('laravel-cache-illuminate:queue:restart','i:1783344623;',2098704623),('laravel-cache-settings.auth_security','O:39:\"Illuminate\\Database\\Eloquent\\Collection\":2:{s:8:\"\0*\0items\";a:33:{s:11:\"otp_enabled\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:1;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:11:\"otp_enabled\";s:5:\"value\";s:5:\"false\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:1;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 13:34:40\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:1;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:11:\"otp_enabled\";s:5:\"value\";s:5:\"false\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:1;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 13:34:40\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:10:\"otp_length\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:2;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:10:\"otp_length\";s:5:\"value\";s:1:\"6\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:2;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:10:\"otp_length\";s:5:\"value\";s:1:\"6\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:18:\"otp_expiry_minutes\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:3;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:18:\"otp_expiry_minutes\";s:5:\"value\";s:1:\"5\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:3;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:18:\"otp_expiry_minutes\";s:5:\"value\";s:1:\"5\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:16:\"otp_max_attempts\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:4;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:16:\"otp_max_attempts\";s:5:\"value\";s:1:\"5\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:4;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:16:\"otp_max_attempts\";s:5:\"value\";s:1:\"5\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:27:\"otp_resend_cooldown_seconds\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:5;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:27:\"otp_resend_cooldown_seconds\";s:5:\"value\";s:2:\"30\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:5;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:27:\"otp_resend_cooldown_seconds\";s:5:\"value\";s:2:\"30\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:16:\"honeypot_enabled\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:6;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:16:\"honeypot_enabled\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:6;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:16:\"honeypot_enabled\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:25:\"max_failed_login_attempts\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:7;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:25:\"max_failed_login_attempts\";s:5:\"value\";s:1:\"5\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:7;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:25:\"max_failed_login_attempts\";s:5:\"value\";s:1:\"5\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:23:\"account_lockout_minutes\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:8;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:23:\"account_lockout_minutes\";s:5:\"value\";s:2:\"15\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:8;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:23:\"account_lockout_minutes\";s:5:\"value\";s:2:\"15\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:25:\"progressive_delay_enabled\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:9;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:25:\"progressive_delay_enabled\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:9;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:25:\"progressive_delay_enabled\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:28:\"ip_failed_attempts_threshold\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:10;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:28:\"ip_failed_attempts_threshold\";s:5:\"value\";s:2:\"20\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:10;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:28:\"ip_failed_attempts_threshold\";s:5:\"value\";s:2:\"20\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:26:\"ip_throttle_window_minutes\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:11;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:26:\"ip_throttle_window_minutes\";s:5:\"value\";s:2:\"15\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:11;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:26:\"ip_throttle_window_minutes\";s:5:\"value\";s:2:\"15\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:28:\"ip_throttle_duration_minutes\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:12;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:28:\"ip_throttle_duration_minutes\";s:5:\"value\";s:2:\"15\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:12;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:28:\"ip_throttle_duration_minutes\";s:5:\"value\";s:2:\"15\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:19:\"password_min_length\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:13;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:19:\"password_min_length\";s:5:\"value\";s:2:\"10\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:13;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:19:\"password_min_length\";s:5:\"value\";s:2:\"10\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:18:\"require_mixed_case\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:14;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:18:\"require_mixed_case\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:14;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:18:\"require_mixed_case\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:15:\"require_numbers\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:15;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:15:\"require_numbers\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:15;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:15:\"require_numbers\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:15:\"require_symbols\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:16;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:15:\"require_symbols\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:16;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:15:\"require_symbols\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:23:\"check_have_i_been_pwned\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:17;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:23:\"check_have_i_been_pwned\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:17;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:23:\"check_have_i_been_pwned\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:22:\"password_history_count\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:18;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:22:\"password_history_count\";s:5:\"value\";s:1:\"5\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:18;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:22:\"password_history_count\";s:5:\"value\";s:1:\"5\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:20:\"password_expiry_days\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:19;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:20:\"password_expiry_days\";s:5:\"value\";s:2:\"90\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:1;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:19;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:20:\"password_expiry_days\";s:5:\"value\";s:2:\"90\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:1;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:28:\"password_expiry_warning_days\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:20;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:28:\"password_expiry_warning_days\";s:5:\"value\";s:1:\"7\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:20;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:28:\"password_expiry_warning_days\";s:5:\"value\";s:1:\"7\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:24:\"session_lifetime_minutes\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:21;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:24:\"session_lifetime_minutes\";s:5:\"value\";s:3:\"120\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:21;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:24:\"session_lifetime_minutes\";s:5:\"value\";s:3:\"120\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:34:\"idle_timeout_admin_manager_minutes\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:22;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:34:\"idle_timeout_admin_manager_minutes\";s:5:\"value\";s:2:\"30\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:22;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:34:\"idle_timeout_admin_manager_minutes\";s:5:\"value\";s:2:\"30\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:36:\"idle_timeout_client_employee_minutes\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:23;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:36:\"idle_timeout_client_employee_minutes\";s:5:\"value\";s:2:\"60\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:23;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:36:\"idle_timeout_client_employee_minutes\";s:5:\"value\";s:2:\"60\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:27:\"idle_warning_before_minutes\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:24;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:27:\"idle_warning_before_minutes\";s:5:\"value\";s:1:\"2\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:24;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:27:\"idle_warning_before_minutes\";s:5:\"value\";s:1:\"2\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:32:\"max_concurrent_sessions_per_user\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:25;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:32:\"max_concurrent_sessions_per_user\";s:5:\"value\";s:1:\"0\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:25;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:32:\"max_concurrent_sessions_per_user\";s:5:\"value\";s:1:\"0\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:28:\"login_anomaly_alerts_enabled\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:26;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:28:\"login_anomaly_alerts_enabled\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:26;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:28:\"login_anomaly_alerts_enabled\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:23:\"invitation_expiry_hours\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:27;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:23:\"invitation_expiry_hours\";s:5:\"value\";s:2:\"48\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:27;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:23:\"invitation_expiry_hours\";s:5:\"value\";s:2:\"48\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:39:\"invitation_completion_throttle_attempts\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:28;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:39:\"invitation_completion_throttle_attempts\";s:5:\"value\";s:1:\"3\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:28;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:39:\"invitation_completion_throttle_attempts\";s:5:\"value\";s:1:\"3\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:38:\"invitation_completion_throttle_minutes\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:29;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:38:\"invitation_completion_throttle_minutes\";s:5:\"value\";s:2:\"10\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:29;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:38:\"invitation_completion_throttle_minutes\";s:5:\"value\";s:2:\"10\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:36:\"force_password_change_on_first_login\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:30;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:36:\"force_password_change_on_first_login\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:1;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:30;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:36:\"force_password_change_on_first_login\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:1;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:21:\"audit_logging_enabled\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:31;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:21:\"audit_logging_enabled\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:1;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:31;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:21:\"audit_logging_enabled\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:1;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:27:\"mask_sensitive_data_in_logs\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:32;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:27:\"mask_sensitive_data_in_logs\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:1;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:32;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:27:\"mask_sensitive_data_in_logs\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:1;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:37:\"unmasked_export_requires_confirmation\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:33;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:37:\"unmasked_export_requires_confirmation\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:33;s:5:\"group\";s:13:\"auth_security\";s:3:\"key\";s:37:\"unmasked_export_requires_confirmation\";s:5:\"value\";s:4:\"true\";s:4:\"type\";s:7:\"boolean\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";N;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 12:01:48\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',2098704880),('laravel-cache-settings.email','O:39:\"Illuminate\\Database\\Eloquent\\Collection\":2:{s:8:\"\0*\0items\";a:6:{s:12:\"from_address\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:38;s:5:\"group\";s:5:\"email\";s:3:\"key\";s:12:\"from_address\";s:5:\"value\";s:23:\"nithidharan24@gmail.com\";s:4:\"type\";s:6:\"string\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 13:30:22\";s:10:\"updated_at\";s:19:\"2026-07-06 13:30:22\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:38;s:5:\"group\";s:5:\"email\";s:3:\"key\";s:12:\"from_address\";s:5:\"value\";s:23:\"nithidharan24@gmail.com\";s:4:\"type\";s:6:\"string\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 13:30:22\";s:10:\"updated_at\";s:19:\"2026-07-06 13:30:22\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:9:\"from_name\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:39;s:5:\"group\";s:5:\"email\";s:3:\"key\";s:9:\"from_name\";s:5:\"value\";s:13:\"TECLA_PAYROLL\";s:4:\"type\";s:6:\"string\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 13:30:22\";s:10:\"updated_at\";s:19:\"2026-07-06 13:30:22\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:39;s:5:\"group\";s:5:\"email\";s:3:\"key\";s:9:\"from_name\";s:5:\"value\";s:13:\"TECLA_PAYROLL\";s:4:\"type\";s:6:\"string\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 13:30:22\";s:10:\"updated_at\";s:19:\"2026-07-06 13:30:22\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:9:\"smtp_host\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:34;s:5:\"group\";s:5:\"email\";s:3:\"key\";s:9:\"smtp_host\";s:5:\"value\";s:14:\"smtp.gmail.com\";s:4:\"type\";s:6:\"string\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 13:30:22\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:34;s:5:\"group\";s:5:\"email\";s:3:\"key\";s:9:\"smtp_host\";s:5:\"value\";s:14:\"smtp.gmail.com\";s:4:\"type\";s:6:\"string\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 13:30:22\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:13:\"smtp_password\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:37;s:5:\"group\";s:5:\"email\";s:3:\"key\";s:13:\"smtp_password\";s:5:\"value\";s:16:\"lrvkgyiabydqmljy\";s:4:\"type\";s:6:\"string\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 13:30:22\";s:10:\"updated_at\";s:19:\"2026-07-06 13:30:22\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:37;s:5:\"group\";s:5:\"email\";s:3:\"key\";s:13:\"smtp_password\";s:5:\"value\";s:16:\"lrvkgyiabydqmljy\";s:4:\"type\";s:6:\"string\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 13:30:22\";s:10:\"updated_at\";s:19:\"2026-07-06 13:30:22\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:9:\"smtp_port\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:35;s:5:\"group\";s:5:\"email\";s:3:\"key\";s:9:\"smtp_port\";s:5:\"value\";s:3:\"587\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 13:30:22\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:35;s:5:\"group\";s:5:\"email\";s:3:\"key\";s:9:\"smtp_port\";s:5:\"value\";s:3:\"587\";s:4:\"type\";s:7:\"integer\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 13:30:22\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}s:13:\"smtp_username\";O:18:\"App\\Models\\Setting\":33:{s:13:\"\0*\0connection\";s:5:\"mysql\";s:8:\"\0*\0table\";s:8:\"settings\";s:13:\"\0*\0primaryKey\";s:2:\"id\";s:10:\"\0*\0keyType\";s:3:\"int\";s:12:\"incrementing\";b:1;s:7:\"\0*\0with\";a:0:{}s:12:\"\0*\0withCount\";a:0:{}s:19:\"preventsLazyLoading\";b:0;s:10:\"\0*\0perPage\";i:15;s:6:\"exists\";b:1;s:18:\"wasRecentlyCreated\";b:0;s:28:\"\0*\0escapeWhenCastingToString\";b:0;s:13:\"\0*\0attributes\";a:9:{s:2:\"id\";i:36;s:5:\"group\";s:5:\"email\";s:3:\"key\";s:13:\"smtp_username\";s:5:\"value\";s:23:\"nithidharan24@gmail.com\";s:4:\"type\";s:6:\"string\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 13:30:22\";}s:11:\"\0*\0original\";a:9:{s:2:\"id\";i:36;s:5:\"group\";s:5:\"email\";s:3:\"key\";s:13:\"smtp_username\";s:5:\"value\";s:23:\"nithidharan24@gmail.com\";s:4:\"type\";s:6:\"string\";s:9:\"is_locked\";i:0;s:10:\"updated_by\";i:64;s:10:\"created_at\";s:19:\"2026-07-06 12:01:48\";s:10:\"updated_at\";s:19:\"2026-07-06 13:30:22\";}s:10:\"\0*\0changes\";a:0:{}s:11:\"\0*\0previous\";a:0:{}s:8:\"\0*\0casts\";a:1:{s:9:\"is_locked\";s:7:\"boolean\";}s:17:\"\0*\0classCastCache\";a:0:{}s:21:\"\0*\0attributeCastCache\";a:0:{}s:13:\"\0*\0dateFormat\";N;s:10:\"\0*\0appends\";a:0:{}s:19:\"\0*\0dispatchesEvents\";a:0:{}s:14:\"\0*\0observables\";a:0:{}s:12:\"\0*\0relations\";a:0:{}s:10:\"\0*\0touches\";a:0:{}s:27:\"\0*\0relationAutoloadCallback\";N;s:26:\"\0*\0relationAutoloadContext\";N;s:10:\"timestamps\";b:1;s:13:\"usesUniqueIds\";b:0;s:9:\"\0*\0hidden\";a:0:{}s:10:\"\0*\0visible\";a:0:{}s:11:\"\0*\0fillable\";a:6:{i:0;s:5:\"group\";i:1;s:3:\"key\";i:2;s:5:\"value\";i:3;s:4:\"type\";i:4;s:9:\"is_locked\";i:5;s:10:\"updated_by\";}s:10:\"\0*\0guarded\";a:1:{i:0;s:1:\"*\";}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',2098704627);
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_branches`
--

DROP TABLE IF EXISTS `client_branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `client_branches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint(20) unsigned NOT NULL,
  `branch_name` varchar(255) NOT NULL,
  `address_line_1` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `branch_code` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `pin_code` varchar(255) DEFAULT NULL,
  `pt_registration_number` varchar(255) DEFAULT NULL,
  `lwf_registration_number` varchar(255) DEFAULT NULL,
  `is_head_office` tinyint(1) NOT NULL DEFAULT 0,
  `gstin` varchar(15) DEFAULT NULL,
  `gst_registration_type` varchar(255) DEFAULT NULL,
  `finance_poc_name` varchar(255) DEFAULT NULL,
  `finance_poc_email` varchar(255) DEFAULT NULL,
  `finance_poc_phone` varchar(255) DEFAULT NULL,
  `is_primary_billing_branch` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_branches_client_id_foreign` (`client_id`),
  CONSTRAINT `client_branches_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_branches`
--

LOCK TABLES `client_branches` WRITE;
/*!40000 ALTER TABLE `client_branches` DISABLE KEYS */;
INSERT INTO `client_branches` VALUES (1,1,'HQ - Mumbai',NULL,NULL,NULL,'Mumbai','Maharashtra',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,0,'2026-07-06 06:31:48','2026-07-06 06:31:48',NULL),(2,2,'HQ - Mumbai',NULL,NULL,NULL,'Mumbai','Maharashtra',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,0,'2026-07-06 06:31:48','2026-07-06 06:31:48',NULL),(3,3,'HQ - Navi Mumbai',NULL,NULL,NULL,'Navi Mumbai','Maharashtra',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,0,'2026-07-06 06:31:48','2026-07-06 06:31:48',NULL),(4,4,'HQ - Bengaluru',NULL,NULL,NULL,'Bengaluru','Karnataka',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,0,'2026-07-06 06:31:48','2026-07-06 06:31:48',NULL);
/*!40000 ALTER TABLE `client_branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_contacts`
--

DROP TABLE IF EXISTS `client_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `client_contacts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint(20) unsigned NOT NULL,
  `contact_type` enum('primary','finance','hr','operations','legal') NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `is_primary_contact` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_contacts_client_id_foreign` (`client_id`),
  CONSTRAINT `client_contacts_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_contacts`
--

LOCK TABLES `client_contacts` WRITE;
/*!40000 ALTER TABLE `client_contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `client_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_documents`
--

DROP TABLE IF EXISTS `client_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `client_documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint(20) unsigned NOT NULL,
  `document_type` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_size_kb` int(11) NOT NULL,
  `uploaded_by` bigint(20) unsigned DEFAULT NULL,
  `verification_status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verified_by` bigint(20) unsigned DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_documents_client_id_foreign` (`client_id`),
  KEY `client_documents_uploaded_by_foreign` (`uploaded_by`),
  KEY `client_documents_verified_by_foreign` (`verified_by`),
  CONSTRAINT `client_documents_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_documents_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`),
  CONSTRAINT `client_documents_verified_by_foreign` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_documents`
--

LOCK TABLES `client_documents` WRITE;
/*!40000 ALTER TABLE `client_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `client_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clients` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) NOT NULL,
  `client_code` varchar(255) NOT NULL,
  `industry` varchar(255) DEFAULT NULL,
  `contract_type` enum('agency','eor','hybrid','consulting') NOT NULL,
  `contract_start_date` date NOT NULL,
  `contract_end_date` date DEFAULT NULL,
  `billing_model` enum('markup','fixed_per_candidate','fixed_per_month','lumpsum','hourly') NOT NULL,
  `markup_percentage` decimal(5,2) DEFAULT NULL,
  `fixed_fee_amount` decimal(12,2) DEFAULT NULL,
  `lop_basis_days` varchar(50) NOT NULL DEFAULT '26',
  `status` enum('onboarding','active','inactive','suspended') NOT NULL DEFAULT 'onboarding',
  `primary_poc_name` varchar(255) NOT NULL,
  `primary_poc_email` varchar(255) NOT NULL,
  `primary_poc_phone` varchar(255) NOT NULL,
  `company_type` enum('pvt_ltd','pub_ltd','llp','opc','partnership','proprietorship','trust','govt') NOT NULL,
  `country` varchar(255) NOT NULL DEFAULT 'India',
  `pan_number` text DEFAULT NULL,
  `tax_id` varchar(255) DEFAULT NULL,
  `tan_number` varchar(255) DEFAULT NULL,
  `gstin` text DEFAULT NULL,
  `trust_registration_number` varchar(255) DEFAULT NULL,
  `registration_number` varchar(255) DEFAULT NULL,
  `cin_number` varchar(255) DEFAULT NULL,
  `incorporation_date` date DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `registered_address_line_1` varchar(255) NOT NULL,
  `registered_address_line_2` varchar(255) DEFAULT NULL,
  `registered_city` varchar(255) NOT NULL,
  `registered_state` varchar(255) NOT NULL,
  `registered_pin` varchar(255) NOT NULL,
  `ot_billing_rule` varchar(255) DEFAULT NULL,
  `payment_net_terms` varchar(255) DEFAULT NULL,
  `credit_limit` decimal(12,2) DEFAULT 0.00,
  `late_payment_penalty_pct` decimal(5,2) DEFAULT 0.00,
  `invoice_cycle` varchar(255) DEFAULT NULL,
  `currency` varchar(255) NOT NULL DEFAULT 'INR',
  `tds_applicable_on_agency_fee` varchar(255) DEFAULT NULL,
  `po_required` tinyint(1) NOT NULL DEFAULT 0,
  `po_number` varchar(255) DEFAULT NULL,
  `contract_document_path` varchar(255) DEFAULT NULL,
  `auto_renewal` tinyint(1) NOT NULL DEFAULT 0,
  `notice_period_days` int(11) NOT NULL DEFAULT 30,
  `pt_state` varchar(255) DEFAULT NULL,
  `state_registration_option` varchar(255) DEFAULT NULL,
  `pf_ceiling` decimal(10,2) NOT NULL DEFAULT 15000.00,
  `pf_applicable` tinyint(1) NOT NULL DEFAULT 1,
  `esi_limit` decimal(10,2) NOT NULL DEFAULT 21000.00,
  `esi_applicable` tinyint(1) NOT NULL DEFAULT 1,
  `lwf_frequency` varchar(255) DEFAULT NULL,
  `lwf_applicable` tinyint(1) NOT NULL DEFAULT 0,
  `tds_regime` varchar(255) DEFAULT NULL,
  `tds_applicable` tinyint(1) NOT NULL DEFAULT 1,
  `default_gratuity_mode` enum('ctc_included','over_ctc','na') NOT NULL DEFAULT 'ctc_included',
  `gratuity_applicable` tinyint(1) NOT NULL DEFAULT 1,
  `statutory_bonus_applicable` tinyint(1) NOT NULL DEFAULT 0,
  `bonus_rate_percentage` decimal(4,2) NOT NULL DEFAULT 8.33,
  `clra_license_number` varchar(255) DEFAULT NULL,
  `clra_license_expiry` date DEFAULT NULL,
  `client_portal_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `portal_primary_email` varchar(255) DEFAULT NULL,
  `portal_access_level` enum('full','view_only','approver') NOT NULL DEFAULT 'view_only',
  `portal_users_limit` int(11) NOT NULL DEFAULT 3,
  `portal_view_salary` tinyint(1) NOT NULL DEFAULT 1,
  `portal_view_invoices` tinyint(1) NOT NULL DEFAULT 1,
  `portal_view_payslips` tinyint(1) NOT NULL DEFAULT 0,
  `portal_raise_requests` tinyint(1) NOT NULL DEFAULT 1,
  `portal_require_2fa` tinyint(1) NOT NULL DEFAULT 1,
  `portal_session_timeout` int(11) NOT NULL DEFAULT 60,
  `portal_ip_whitelist` varchar(255) DEFAULT NULL,
  `sla_tier` enum('standard','premium','enterprise') NOT NULL DEFAULT 'standard',
  `cutoff_day` varchar(255) DEFAULT NULL,
  `payroll_lock_day` varchar(255) DEFAULT NULL,
  `salary_credit_day` varchar(255) DEFAULT NULL,
  `invoice_dispute_window_days` int(11) DEFAULT NULL,
  `invoice_raise_day` varchar(255) DEFAULT NULL,
  `payroll_convention` varchar(255) DEFAULT NULL,
  `custom_cycle_start_day` int(11) NOT NULL DEFAULT 1,
  `custom_cycle_end_day` int(11) NOT NULL DEFAULT 28,
  `auto_reminders` tinyint(1) NOT NULL DEFAULT 1,
  `client_notes` text DEFAULT NULL,
  `account_manager_id` bigint(20) unsigned DEFAULT NULL,
  `backup_account_manager_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clients_client_code_unique` (`client_code`),
  KEY `clients_account_manager_id_foreign` (`account_manager_id`),
  KEY `clients_backup_account_manager_id_foreign` (`backup_account_manager_id`),
  CONSTRAINT `clients_account_manager_id_foreign` FOREIGN KEY (`account_manager_id`) REFERENCES `users` (`id`),
  CONSTRAINT `clients_backup_account_manager_id_foreign` FOREIGN KEY (`backup_account_manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (1,'Mahindra Corp','MAH001','Automotive','agency','2023-01-01',NULL,'markup',10.50,NULL,'26','active','Rahul Bajaj','rahul.b@mahindra.example.com','9876543210','pub_ltd','India','eyJpdiI6IllmaVlRN0FnekNad2ZMNVhLQTZLQkE9PSIsInZhbHVlIjoiRk5CRGI5M0E2ZjY2R0lTRWNndHJWZz09IiwibWFjIjoiZTViZTYzNDBhZjFhYmUzOTI0ZjJhYWY2NjkwMmVjOTIzMTZiNGZjYjBlY2FiZWQ1NjQ0NDYzZDFiY2ViNmM4NSIsInRhZyI6IiJ9',NULL,NULL,'eyJpdiI6IllHbXVCZ0FJdlprMVE1V0YvdzNadXc9PSIsInZhbHVlIjoiVDQ0eEh5UnkySjFrQUVuanVUNkw5QT09IiwibWFjIjoiODY1ZWQ0ZmUwYjM4NjdkMzM3MjkyM2YxNWE3MGEzNzMwYjY2Y2EzMzQ0ZDBkNDk0ZjU4ZDU5MzYyM2FlYmNiYyIsInRhZyI6IiJ9',NULL,NULL,NULL,NULL,NULL,NULL,'Mahindra Towers',NULL,'Mumbai','Maharashtra','400018',NULL,NULL,0.00,0.00,NULL,'INR',NULL,0,NULL,NULL,0,30,NULL,NULL,15000.00,1,21000.00,1,NULL,0,NULL,1,'ctc_included',1,0,8.33,NULL,NULL,1,NULL,'view_only',3,1,1,0,1,1,60,NULL,'standard',NULL,NULL,NULL,NULL,NULL,NULL,1,28,1,NULL,NULL,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48',NULL),(2,'TCS','TCS002','IT Services','hybrid','2022-05-15',NULL,'fixed_per_candidate',NULL,5000.00,'26','active','Anita Desai','anita.d@tcs.example.com','9876543211','pub_ltd','India','eyJpdiI6InVQaVZucnFHQjlsMUVYTVlMQW9LY3c9PSIsInZhbHVlIjoieUhqdnFXTFRhV2ZBR3EvWlJoMmJVQT09IiwibWFjIjoiYTI2OTA3NDZhMDRiNDBjNjI3OTJiZTI4ZDYxMmIyOTM1MWQ4MzkzMTQwMjU2YjMxZTdmOTMwNWEyNzViNzhkOSIsInRhZyI6IiJ9',NULL,NULL,'eyJpdiI6IkFkNHY4Kyt5TFllWDM4VWtOV0Nlcnc9PSIsInZhbHVlIjoiNC9lV0tUM1NPNlF0enhLTWRJVXFHUT09IiwibWFjIjoiMDcwODEwOGFkMzQ0YzM3MTEyMTdkZDRhMDJmMTAxYjc3ZmE1MTEwNDNjYTIzNjIxNzA1ZWE2ZWNkYTJkNGZkNCIsInRhZyI6IiJ9',NULL,NULL,NULL,NULL,NULL,NULL,'TCS Banyan Park',NULL,'Mumbai','Maharashtra','400060',NULL,NULL,0.00,0.00,NULL,'INR',NULL,0,NULL,NULL,0,30,NULL,NULL,15000.00,1,21000.00,1,NULL,0,NULL,1,'ctc_included',1,0,8.33,NULL,NULL,1,NULL,'view_only',3,1,1,0,1,1,60,NULL,'standard',NULL,NULL,NULL,NULL,NULL,NULL,1,28,1,NULL,NULL,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48',NULL),(3,'Reliance','REL003','Conglomerate','eor','2021-10-01',NULL,'markup',12.00,NULL,'26','active','Mukesh S','mukesh.s@reliance.example.com','9876543212','pub_ltd','India','eyJpdiI6InFjT2t0UGtNZjhtS2o1RDhXSEhhb2c9PSIsInZhbHVlIjoiSW44OVJ3U1REQUl6alNqTXB6VXU2QT09IiwibWFjIjoiOTlkMzA0NjA1MjFiZTg4YzZkYzAxYzgyYmRiNjc1NTA2N2UyMTc5YzgyYzU3ZWY1Y2M5ZWQxNTZjMDQ1NjNkMyIsInRhZyI6IiJ9',NULL,NULL,'eyJpdiI6Ii83RkdKTDZYek5SdTRzWEFZbGFwZFE9PSIsInZhbHVlIjoibTJrdDlCdFFaYUhDSGVoS2RiZ3FlZz09IiwibWFjIjoiZTVjMWQwMWU2MjcxZGE2MDNlMTNmMjQ4YTQzNDNkMWE3NWMzMDZkMDhkNWMxYWNiMWRlOGY1YTQ4MmU4YmVkZiIsInRhZyI6IiJ9',NULL,NULL,NULL,NULL,NULL,NULL,'Reliance Corporate Park',NULL,'Navi Mumbai','Maharashtra','400701',NULL,NULL,0.00,0.00,NULL,'INR',NULL,0,NULL,NULL,0,30,NULL,NULL,15000.00,1,21000.00,1,NULL,0,NULL,1,'ctc_included',1,0,8.33,NULL,NULL,1,NULL,'view_only',3,1,1,0,1,1,60,NULL,'standard',NULL,NULL,NULL,NULL,NULL,NULL,1,28,1,NULL,NULL,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48',NULL),(4,'Wipro','WIP004','IT Services','agency','2024-02-01',NULL,'hourly',NULL,NULL,'26','active','Azim K','azim.k@wipro.example.com','9876543213','pub_ltd','India','eyJpdiI6IlE0UGQzbTZIa3pqVmxtd1FvYytzcGc9PSIsInZhbHVlIjoiMmx0cUlRaXFUVHZETWIwMkYrNjlWQT09IiwibWFjIjoiMWM0MzA4OGE3NmJjNWJhODBhNTRhOWU3MmYwYjRhZDg4NjIzNzdkMGVhZjFlZjg2MmMyYzg5Yzg1YThjNjhlYyIsInRhZyI6IiJ9',NULL,NULL,'eyJpdiI6IjU0RW1BUmhZQmFQVVQ4ak1jRGVKcHc9PSIsInZhbHVlIjoiUjkyZ3dEVTk0Tmg4TFdId0ZmUkxBQT09IiwibWFjIjoiMTU4YzA4MDE1OGExNjQ1ZjgxNGQxNGI2ZWE1MDM0Y2Q1ZDA5NzNlODJjMjAwZmE0MmJhYjI4YTMzMTQyMGFlYSIsInRhZyI6IiJ9',NULL,NULL,NULL,NULL,NULL,NULL,'Doddakannelli',NULL,'Bengaluru','Karnataka','560035',NULL,NULL,0.00,0.00,NULL,'INR',NULL,0,NULL,NULL,0,30,NULL,NULL,15000.00,1,21000.00,1,NULL,0,NULL,1,'ctc_included',1,0,8.33,NULL,NULL,1,NULL,'view_only',3,1,1,0,1,1,60,NULL,'standard',NULL,NULL,NULL,NULL,NULL,NULL,1,28,1,NULL,NULL,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48',NULL);
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_documents`
--

DROP TABLE IF EXISTS `employee_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `employee_documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_documents`
--

LOCK TABLES `employee_documents` WRITE;
/*!40000 ALTER TABLE `employee_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_exits`
--

DROP TABLE IF EXISTS `employee_exits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `employee_exits` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_exits`
--

LOCK TABLES `employee_exits` WRITE;
/*!40000 ALTER TABLE `employee_exits` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_exits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `employees` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(255) NOT NULL,
  `client_id` bigint(20) unsigned NOT NULL,
  `branch_id` bigint(20) unsigned NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `personal_email` varchar(255) NOT NULL,
  `phone_number` varchar(255) NOT NULL,
  `date_of_birth` date NOT NULL,
  `date_of_joining` date NOT NULL,
  `designation` varchar(255) NOT NULL,
  `employment_model` enum('eor','agency_contract') NOT NULL,
  `status` enum('active','onboarding','exited') NOT NULL DEFAULT 'onboarding',
  `gender` enum('male','female','other') DEFAULT NULL,
  `blood_group` varchar(255) DEFAULT NULL,
  `marital_status` enum('single','married','other') DEFAULT NULL,
  `emergency_contact_name` varchar(255) DEFAULT NULL,
  `emergency_contact_phone` varchar(255) DEFAULT NULL,
  `residential_address` text DEFAULT NULL,
  `previous_employer_name` varchar(255) DEFAULT NULL,
  `previous_employer_uan` varchar(255) DEFAULT NULL,
  `aadhaar_number` text DEFAULT NULL,
  `aadhaar_number_hash` varchar(255) DEFAULT NULL,
  `probation_end_date` date DEFAULT NULL,
  `reporting_manager_id` bigint(20) unsigned DEFAULT NULL,
  `prior_employment_flag` tinyint(1) NOT NULL DEFAULT 0,
  `declarations_accepted` tinyint(1) NOT NULL DEFAULT 0,
  `basic_pay` decimal(10,2) NOT NULL,
  `hra` decimal(10,2) NOT NULL,
  `conveyance` decimal(10,2) NOT NULL,
  `da` decimal(10,2) NOT NULL,
  `medical_allowance` decimal(10,2) NOT NULL,
  `special_allowance` decimal(10,2) NOT NULL,
  `other_additions` decimal(10,2) NOT NULL DEFAULT 0.00,
  `gross_monthly_salary` decimal(10,2) NOT NULL,
  `net_take_home_monthly` decimal(10,2) NOT NULL,
  `employer_pf_monthly` decimal(10,2) NOT NULL,
  `employer_esi_monthly` decimal(10,2) NOT NULL,
  `ctc_monthly` decimal(10,2) NOT NULL,
  `pf_applicable` tinyint(1) NOT NULL DEFAULT 1,
  `esi_applicable` tinyint(1) NOT NULL DEFAULT 1,
  `esi_contribution_period_end` date DEFAULT NULL,
  `pt_applicable` tinyint(1) NOT NULL DEFAULT 1,
  `pt_deduction_override` decimal(8,2) DEFAULT NULL,
  `lwf_applicable` tinyint(1) NOT NULL DEFAULT 1,
  `tds_regime` enum('old','new') NOT NULL DEFAULT 'new',
  `tds_applicable` tinyint(1) NOT NULL DEFAULT 1,
  `gratuity_mode` enum('part_of_ctc','over_and_above') NOT NULL,
  `lop_basis_days` enum('26','30') NOT NULL DEFAULT '26',
  `bonus_toggle` tinyint(1) NOT NULL DEFAULT 0,
  `bank_account_number` text NOT NULL,
  `bank_account_hash` varchar(255) DEFAULT NULL,
  `account_holder_name` varchar(255) NOT NULL,
  `bank_ifsc` varchar(255) NOT NULL,
  `bank_name` varchar(255) NOT NULL,
  `bank_branch` varchar(255) NOT NULL,
  `uan_mode` enum('new','existing_transfer') NOT NULL,
  `uan_number` varchar(255) DEFAULT NULL,
  `esic_number` varchar(255) DEFAULT NULL,
  `pan_number` text NOT NULL,
  `pan_number_hash` varchar(255) DEFAULT NULL,
  `last_working_day` date DEFAULT NULL,
  `exit_reason` enum('resignation','termination','end_of_contract','absconding') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_employee_code_unique` (`employee_code`),
  UNIQUE KEY `employees_personal_email_unique` (`personal_email`),
  UNIQUE KEY `employees_phone_number_unique` (`phone_number`),
  UNIQUE KEY `employees_pan_number_hash_unique` (`pan_number_hash`),
  UNIQUE KEY `employees_aadhaar_number_hash_unique` (`aadhaar_number_hash`),
  UNIQUE KEY `employees_bank_account_hash_unique` (`bank_account_hash`),
  KEY `employees_branch_id_foreign` (`branch_id`),
  KEY `employees_reporting_manager_id_foreign` (`reporting_manager_id`),
  KEY `employees_client_id_foreign` (`client_id`),
  CONSTRAINT `employees_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `client_branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employees_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  CONSTRAINT `employees_reporting_manager_id_foreign` FOREIGN KEY (`reporting_manager_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (1,'TEC-088',1,1,'Aarav Sharma','aarav.s@example.com','9876543001','1990-05-15','2023-01-10','Software Engineer','agency_contract','active','male',NULL,'single',NULL,NULL,'Andheri West, Mumbai, Maharashtra 400053',NULL,NULL,'eyJpdiI6IlZZV3BjeHBrOWtxQUxEcHlXZGRZUVE9PSIsInZhbHVlIjoiekl1V0xHK0d1WjJmUllYU1dhNUZCQT09IiwibWFjIjoiMjcyNTUwOTEzZmExY2NjZTgwMGVkN2IxZGUwMmExNjY5NDYyZmRmODY5OWM1Y2Y3ZTFlNzk5MDlhN2E2MDA0MCIsInRhZyI6IiJ9',NULL,NULL,NULL,0,0,25000.00,12500.00,0.00,0.00,0.00,12500.00,0.00,50000.00,45000.00,1950.00,0.00,51950.00,1,0,NULL,1,NULL,1,'new',1,'part_of_ctc','26',0,'eyJpdiI6InlsRlBWS0JTV2Y1cHpMbEFYS3FvdGc9PSIsInZhbHVlIjoiY2laaE9hbG5vUlB0Q1dUemN4REJGQT09IiwibWFjIjoiZWU0MzM1NWNiMmY5YTU4NTFhMjI1MWJmOTlkM2FkNWViZWY2NGUxYTQ1ZDYzOTVkOGZjYmY1ODUxN2VkYTEyMCIsInRhZyI6IiJ9',NULL,'Aarav Sharma','HDFC0001234','HDFC Bank','Andheri','new','100000000088',NULL,'eyJpdiI6IlUyaWlyM1o5b2pqN3MwKzJOV2JxaEE9PSIsInZhbHVlIjoiZXhONjB0ZGYvZERyUVFHRENQZkNUdz09IiwibWFjIjoiNWYwY2EyZGQ0NGJlMmUxNDZhMTY3YTkyNTQ5YjE3NGU3ZDIwOWIzMzAxZTRmYTlkZDg0MDc0YjIyMzA1YjQyYiIsInRhZyI6IiJ9',NULL,NULL,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(2,'TEC-121',2,2,'Neha Patil','neha.p@example.com','9876543002','1992-08-20','2022-11-01','Product Manager','agency_contract','active','female',NULL,'married',NULL,NULL,'Bandra East, Mumbai, Maharashtra 400051',NULL,NULL,'eyJpdiI6Iko3RExBd1pFY0FPamxKK1JwUUVhVWc9PSIsInZhbHVlIjoid1Y2MnpTSzRBNGhBVVhlOUlTMjBWdz09IiwibWFjIjoiOGY4MDg0ZGU4NGMwZmU0NDE0ZDUzYmM5Y2RlOWY1M2JhYzg2ZWYwMzljMDlmMzlmZTA3MDJlYzhhNTg5MzcyOSIsInRhZyI6IiJ9',NULL,NULL,NULL,0,0,40000.00,20000.00,0.00,0.00,0.00,20000.00,0.00,80000.00,74000.00,1800.00,0.00,81800.00,1,0,NULL,1,NULL,1,'new',1,'part_of_ctc','26',0,'eyJpdiI6IjFEUGM1TGdpemtSenZhNytuV1J3M0E9PSIsInZhbHVlIjoiSHVnKzBWMmQzbmZjbVY2RFhlZU42dz09IiwibWFjIjoiYmQ5MjlhZDkxYjY2MWE4OTUzNTdkYzg5ZmQ0MmUyN2UzMjMwM2Q4ZTE2NDRiNGVkMDBmNDA2YTEwN2Y3MWVkZCIsInRhZyI6IiJ9',NULL,'Neha Patil','ICIC0009876','ICICI Bank','Bandra','new','100000000121',NULL,'eyJpdiI6IkpiWUx1cldwMkdueTZqYVpndFc2bUE9PSIsInZhbHVlIjoiM3BuSmJkY0JSVENaaVB3MEZUTERJZz09IiwibWFjIjoiN2M4ZTNkNTkzY2Q5N2ZkMjM1MzA1ZGViYjUzZDgyYTA5YTlmZjJkYjNlNTRlNzc1ODc5MmY0YjQ3NjQxZDExMiIsInRhZyI6IiJ9',NULL,NULL,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48');
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
INSERT INTO `jobs` VALUES (1,'default','{\"uuid\":\"7095777d-c676-4fcf-ba52-c6ec9e803029\",\"displayName\":\"App\\\\Mail\\\\OtpMail\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":null,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":null,\"timeout\":null,\"retryUntil\":null,\"data\":{\"commandName\":\"Illuminate\\\\Mail\\\\SendQueuedMailable\",\"command\":\"O:34:\\\"Illuminate\\\\Mail\\\\SendQueuedMailable\\\":17:{s:8:\\\"mailable\\\";O:16:\\\"App\\\\Mail\\\\OtpMail\\\":4:{s:4:\\\"code\\\";s:6:\\\"121796\\\";s:4:\\\"user\\\";O:45:\\\"Illuminate\\\\Contracts\\\\Database\\\\ModelIdentifier\\\":5:{s:5:\\\"class\\\";s:15:\\\"App\\\\Models\\\\User\\\";s:2:\\\"id\\\";i:64;s:9:\\\"relations\\\";a:0:{}s:10:\\\"connection\\\";s:5:\\\"mysql\\\";s:15:\\\"collectionClass\\\";N;}s:2:\\\"to\\\";a:1:{i:0;a:2:{s:4:\\\"name\\\";N;s:7:\\\"address\\\";s:14:\\\"admin@tecla.in\\\";}}s:6:\\\"mailer\\\";s:3:\\\"log\\\";}s:5:\\\"tries\\\";N;s:7:\\\"timeout\\\";N;s:13:\\\"maxExceptions\\\";N;s:17:\\\"shouldBeEncrypted\\\";b:0;s:10:\\\"connection\\\";N;s:5:\\\"queue\\\";N;s:12:\\\"messageGroup\\\";N;s:12:\\\"deduplicator\\\";N;s:5:\\\"delay\\\";N;s:11:\\\"afterCommit\\\";N;s:10:\\\"middleware\\\";a:0:{}s:7:\\\"chained\\\";a:0:{}s:15:\\\"chainConnection\\\";N;s:10:\\\"chainQueue\\\";N;s:19:\\\"chainCatchCallbacks\\\";N;s:3:\\\"job\\\";N;}\",\"batchId\":null},\"createdAt\":1783344095,\"delay\":null}',0,NULL,1783344095,1783344095),(2,'default','{\"uuid\":\"44d3e6a8-13be-44c8-ade6-3d6c142de999\",\"displayName\":\"App\\\\Mail\\\\OtpMail\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":null,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":null,\"timeout\":null,\"retryUntil\":null,\"data\":{\"commandName\":\"Illuminate\\\\Mail\\\\SendQueuedMailable\",\"command\":\"O:34:\\\"Illuminate\\\\Mail\\\\SendQueuedMailable\\\":17:{s:8:\\\"mailable\\\";O:16:\\\"App\\\\Mail\\\\OtpMail\\\":4:{s:4:\\\"code\\\";s:6:\\\"188005\\\";s:4:\\\"user\\\";O:45:\\\"Illuminate\\\\Contracts\\\\Database\\\\ModelIdentifier\\\":5:{s:5:\\\"class\\\";s:15:\\\"App\\\\Models\\\\User\\\";s:2:\\\"id\\\";i:64;s:9:\\\"relations\\\";a:0:{}s:10:\\\"connection\\\";s:5:\\\"mysql\\\";s:15:\\\"collectionClass\\\";N;}s:2:\\\"to\\\";a:1:{i:0;a:2:{s:4:\\\"name\\\";N;s:7:\\\"address\\\";s:22:\\\"mavicjesh481@gmail.com\\\";}}s:6:\\\"mailer\\\";s:3:\\\"log\\\";}s:5:\\\"tries\\\";N;s:7:\\\"timeout\\\";N;s:13:\\\"maxExceptions\\\";N;s:17:\\\"shouldBeEncrypted\\\";b:0;s:10:\\\"connection\\\";N;s:5:\\\"queue\\\";N;s:12:\\\"messageGroup\\\";N;s:12:\\\"deduplicator\\\";N;s:5:\\\"delay\\\";N;s:11:\\\"afterCommit\\\";N;s:10:\\\"middleware\\\";a:0:{}s:7:\\\"chained\\\";a:0:{}s:15:\\\"chainConnection\\\";N;s:10:\\\"chainQueue\\\";N;s:19:\\\"chainCatchCallbacks\\\";N;s:3:\\\"job\\\";N;}\",\"batchId\":null},\"createdAt\":1783344182,\"delay\":null}',0,NULL,1783344182,1783344182),(3,'default','{\"uuid\":\"8b9efe5b-01a5-4aa1-8954-b4f5c2a2c99e\",\"displayName\":\"App\\\\Mail\\\\OtpMail\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":null,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":null,\"timeout\":null,\"retryUntil\":null,\"data\":{\"commandName\":\"Illuminate\\\\Mail\\\\SendQueuedMailable\",\"command\":\"O:34:\\\"Illuminate\\\\Mail\\\\SendQueuedMailable\\\":17:{s:8:\\\"mailable\\\";O:16:\\\"App\\\\Mail\\\\OtpMail\\\":4:{s:4:\\\"code\\\";s:6:\\\"725449\\\";s:4:\\\"user\\\";O:45:\\\"Illuminate\\\\Contracts\\\\Database\\\\ModelIdentifier\\\":5:{s:5:\\\"class\\\";s:15:\\\"App\\\\Models\\\\User\\\";s:2:\\\"id\\\";i:64;s:9:\\\"relations\\\";a:0:{}s:10:\\\"connection\\\";s:5:\\\"mysql\\\";s:15:\\\"collectionClass\\\";N;}s:2:\\\"to\\\";a:1:{i:0;a:2:{s:4:\\\"name\\\";N;s:7:\\\"address\\\";s:22:\\\"mavicjesh481@gmail.com\\\";}}s:6:\\\"mailer\\\";s:4:\\\"smtp\\\";}s:5:\\\"tries\\\";N;s:7:\\\"timeout\\\";N;s:13:\\\"maxExceptions\\\";N;s:17:\\\"shouldBeEncrypted\\\";b:0;s:10:\\\"connection\\\";N;s:5:\\\"queue\\\";N;s:12:\\\"messageGroup\\\";N;s:12:\\\"deduplicator\\\";N;s:5:\\\"delay\\\";N;s:11:\\\"afterCommit\\\";N;s:10:\\\"middleware\\\";a:0:{}s:7:\\\"chained\\\";a:0:{}s:15:\\\"chainConnection\\\";N;s:10:\\\"chainQueue\\\";N;s:19:\\\"chainCatchCallbacks\\\";N;s:3:\\\"job\\\";N;}\",\"batchId\":null},\"createdAt\":1783344677,\"delay\":null}',0,NULL,1783344677,1783344677),(4,'default','{\"uuid\":\"c47627e8-0e11-4f09-acc8-9cd2821dcf45\",\"displayName\":\"App\\\\Mail\\\\OtpMail\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":null,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":null,\"timeout\":null,\"retryUntil\":null,\"data\":{\"commandName\":\"Illuminate\\\\Mail\\\\SendQueuedMailable\",\"command\":\"O:34:\\\"Illuminate\\\\Mail\\\\SendQueuedMailable\\\":17:{s:8:\\\"mailable\\\";O:16:\\\"App\\\\Mail\\\\OtpMail\\\":4:{s:4:\\\"code\\\";s:6:\\\"099878\\\";s:4:\\\"user\\\";O:45:\\\"Illuminate\\\\Contracts\\\\Database\\\\ModelIdentifier\\\":5:{s:5:\\\"class\\\";s:15:\\\"App\\\\Models\\\\User\\\";s:2:\\\"id\\\";i:64;s:9:\\\"relations\\\";a:0:{}s:10:\\\"connection\\\";s:5:\\\"mysql\\\";s:15:\\\"collectionClass\\\";N;}s:2:\\\"to\\\";a:1:{i:0;a:2:{s:4:\\\"name\\\";N;s:7:\\\"address\\\";s:22:\\\"mavicjesh481@gmail.com\\\";}}s:6:\\\"mailer\\\";s:4:\\\"smtp\\\";}s:5:\\\"tries\\\";N;s:7:\\\"timeout\\\";N;s:13:\\\"maxExceptions\\\";N;s:17:\\\"shouldBeEncrypted\\\";b:0;s:10:\\\"connection\\\";N;s:5:\\\"queue\\\";N;s:12:\\\"messageGroup\\\";N;s:12:\\\"deduplicator\\\";N;s:5:\\\"delay\\\";N;s:11:\\\"afterCommit\\\";N;s:10:\\\"middleware\\\";a:0:{}s:7:\\\"chained\\\";a:0:{}s:15:\\\"chainConnection\\\";N;s:10:\\\"chainQueue\\\";N;s:19:\\\"chainCatchCallbacks\\\";N;s:3:\\\"job\\\";N;}\",\"batchId\":null},\"createdAt\":1783344740,\"delay\":null}',0,NULL,1783344740,1783344740);
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_attempts`
--

DROP TABLE IF EXISTS `login_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_attempts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `attempts` int(10) unsigned NOT NULL DEFAULT 0,
  `last_attempt_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `login_attempts_ip_address_unique` (`ip_address`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_attempts`
--

LOCK TABLES `login_attempts` WRITE;
/*!40000 ALTER TABLE `login_attempts` DISABLE KEYS */;
INSERT INTO `login_attempts` VALUES (1,'127.0.0.1',5,'2026-07-06 08:01:51');
/*!40000 ALTER TABLE `login_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_07_03_105316_create_clients_table',1),(5,'2026_07_03_105501_create_client_contacts_table',1),(6,'2026_07_03_105505_create_client_documents_table',1),(7,'2026_07_03_113614_create_client_branches_table',1),(8,'2026_07_03_113615_create_employees_table',1),(9,'2026_07_03_113618_create_employee_documents_table',1),(10,'2026_07_03_113622_create_salary_revisions_table',1),(11,'2026_07_03_113625_create_employee_exits_table',1),(12,'2026_07_03_113627_create_bank_change_requests_table',1),(13,'2026_07_03_160706_create_settings_table',1),(14,'2026_07_03_173413_extend_users_table',1),(15,'2026_07_03_173435_create_otp_codes_table',1),(16,'2026_07_03_173437_create_password_histories_table',1),(17,'2026_07_03_173440_create_audit_logs_table',1),(18,'2026_07_03_173442_create_login_attempts_table',1),(19,'2026_07_04_064253_change_encrypted_columns_length',1),(20,'2026_07_04_064926_add_gst_and_poc_fields_to_client_branches_table',1),(21,'2026_07_04_075241_add_separate_address_fields_to_client_branches_table',1),(22,'2026_07_04_093636_modify_document_type_in_client_documents_table',1),(23,'2026_07_04_121016_add_backup_account_manager_to_clients_table',1),(24,'2026_07_05_051324_change_lop_basis_days_to_string_on_clients_table',1),(25,'2026_07_05_062110_add_missing_wizard_fields_to_clients_table',1),(26,'2026_07_05_071600_fix_client_sla_fields_and_nullable',1),(27,'2026_07_06_055521_add_soft_deletes_to_client_tables',1),(28,'2026_07_06_055524_change_employee_client_id_fk_to_restrict',1),(29,'2026_07_06_055525_add_suspended_reason_to_users',1),(30,'2026_07_06_104638_add_dynamic_fields_and_indexes_to_employees_table',1),(31,'2026_07_06_124619_add_status_and_approved_at_to_salary_revisions_table',2);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otp_codes`
--

DROP TABLE IF EXISTS `otp_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `otp_codes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `purpose` enum('login','password_reset','invitation') NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `consumed_at` timestamp NULL DEFAULT NULL,
  `attempts` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `otp_codes_user_id_foreign` (`user_id`),
  CONSTRAINT `otp_codes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otp_codes`
--

LOCK TABLES `otp_codes` WRITE;
/*!40000 ALTER TABLE `otp_codes` DISABLE KEYS */;
INSERT INTO `otp_codes` VALUES (1,64,'login','$2y$12$OzqphOgE0TteqAMMNb.yXOVKMhJgruZJhLE3UOZFLLrkhuAHDvpxq','2026-07-06 08:13:16',NULL,0,'127.0.0.1','2026-07-06 07:51:31','2026-07-06 07:51:31'),(2,64,'login','$2y$12$OzqphOgE0TteqAMMNb.yXOVKMhJgruZJhLE3UOZFLLrkhuAHDvpxq','2026-07-06 08:13:16',NULL,0,'127.0.0.1','2026-07-06 07:53:02','2026-07-06 07:55:51'),(3,64,'login','$2y$12$OzqphOgE0TteqAMMNb.yXOVKMhJgruZJhLE3UOZFLLrkhuAHDvpxq','2026-07-06 08:13:16',NULL,0,'127.0.0.1','2026-07-06 08:01:16','2026-07-06 08:01:51'),(4,64,'login','$2y$12$OzqphOgE0TteqAMMNb.yXOVKMhJgruZJhLE3UOZFLLrkhuAHDvpxq','2026-07-06 13:33:57','2026-07-06 08:03:57',1,'127.0.0.1','2026-07-06 08:02:20','2026-07-06 08:03:57');
/*!40000 ALTER TABLE `otp_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_histories`
--

DROP TABLE IF EXISTS `password_histories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_histories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `password_histories_user_id_foreign` (`user_id`),
  CONSTRAINT `password_histories_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_histories`
--

LOCK TABLES `password_histories` WRITE;
/*!40000 ALTER TABLE `password_histories` DISABLE KEYS */;
INSERT INTO `password_histories` VALUES (1,64,'$2y$12$OB6JP77bNJvaWtZnrQlCZO6Ie52vj8fw/V6KzXC8wWo6PHYX3ibta','2026-07-06 07:58:37');
/*!40000 ALTER TABLE `password_histories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_revisions`
--

DROP TABLE IF EXISTS `salary_revisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `salary_revisions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `old_basic_pay` decimal(10,2) NOT NULL,
  `old_hra` decimal(10,2) NOT NULL,
  `old_conveyance` decimal(10,2) NOT NULL,
  `old_da` decimal(10,2) NOT NULL,
  `old_medical_allowance` decimal(10,2) NOT NULL,
  `old_special_allowance` decimal(10,2) NOT NULL,
  `old_other_additions` decimal(10,2) NOT NULL DEFAULT 0.00,
  `old_net_take_home` decimal(10,2) NOT NULL,
  `old_ctc` decimal(10,2) NOT NULL,
  `new_basic_pay` decimal(10,2) NOT NULL,
  `new_hra` decimal(10,2) NOT NULL,
  `new_conveyance` decimal(10,2) NOT NULL,
  `new_da` decimal(10,2) NOT NULL,
  `new_medical_allowance` decimal(10,2) NOT NULL,
  `new_special_allowance` decimal(10,2) NOT NULL,
  `new_other_additions` decimal(10,2) NOT NULL DEFAULT 0.00,
  `new_net_take_home` decimal(10,2) NOT NULL,
  `new_ctc` decimal(10,2) NOT NULL,
  `effective_date` date NOT NULL,
  `reason_for_revision` varchar(255) DEFAULT NULL,
  `status` enum('pending_approval','approved','rejected') NOT NULL DEFAULT 'pending_approval',
  `rejection_reason` varchar(255) DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `salary_revisions_employee_id_foreign` (`employee_id`),
  KEY `salary_revisions_approved_by_foreign` (`approved_by`),
  CONSTRAINT `salary_revisions_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `salary_revisions_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_revisions`
--

LOCK TABLES `salary_revisions` WRITE;
/*!40000 ALTER TABLE `salary_revisions` DISABLE KEYS */;
/*!40000 ALTER TABLE `salary_revisions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('3d94yT8UzVaoVuTIrVzdpyfXbA5j9XuppcXUUJd8',64,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','YTo1OntzOjY6Il90b2tlbiI7czo0MDoiNmpoUGNBVlgyVTN2Wlg2TFRibGhKYVcyUmlzNUN6OXptMWd6dHdUayI7czozOiJ1cmwiO2E6MTp7czo4OiJpbnRlbmRlZCI7czoyMToiaHR0cDovLzEyNy4wLjAuMTo4MDAwIjt9czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mzg6Imh0dHA6Ly8xMjcuMC4wLjE6ODAwMC9lbXBsb3llZXMvY3JlYXRlIjtzOjU6InJvdXRlIjtOO31zOjY6Il9mbGFzaCI7YToyOntzOjM6Im9sZCI7YTowOnt9czozOiJuZXciO2E6MDp7fX1zOjUwOiJsb2dpbl93ZWJfNTliYTM2YWRkYzJiMmY5NDAxNTgwZjAxNGM3ZjU4ZWE0ZTMwOTg5ZCI7aTo2NDt9',1783399075),('kUiVekqMo7rgBizqnmWkGyKiySUP2fXZNaKc4Zhx',60,'127.0.0.1','Symfony','YTozOntzOjUwOiJsb2dpbl93ZWJfNTliYTM2YWRkYzJiMmY5NDAxNTgwZjAxNGM3ZjU4ZWE0ZTMwOTg5ZCI7aTo2MDtzOjY6Il90b2tlbiI7czo0MDoieFFHTnJQdVpyVXZFd2VXTXVHYmdRdldEN3Bmb2lQZUVaY3Z1Njg3VCI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==',1783343499);
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `group` varchar(255) NOT NULL,
  `key` varchar(255) NOT NULL,
  `value` text DEFAULT NULL,
  `type` enum('string','boolean','integer','json') NOT NULL DEFAULT 'string',
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_group_key_unique` (`group`,`key`),
  KEY `settings_updated_by_foreign` (`updated_by`),
  CONSTRAINT `settings_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,'auth_security','otp_enabled','false','boolean',1,64,'2026-07-06 06:31:48','2026-07-06 08:04:40'),(2,'auth_security','otp_length','6','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(3,'auth_security','otp_expiry_minutes','5','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(4,'auth_security','otp_max_attempts','5','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(5,'auth_security','otp_resend_cooldown_seconds','30','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(6,'auth_security','honeypot_enabled','true','boolean',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(7,'auth_security','max_failed_login_attempts','5','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(8,'auth_security','account_lockout_minutes','15','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(9,'auth_security','progressive_delay_enabled','true','boolean',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(10,'auth_security','ip_failed_attempts_threshold','20','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(11,'auth_security','ip_throttle_window_minutes','15','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(12,'auth_security','ip_throttle_duration_minutes','15','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(13,'auth_security','password_min_length','10','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(14,'auth_security','require_mixed_case','true','boolean',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(15,'auth_security','require_numbers','true','boolean',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(16,'auth_security','require_symbols','true','boolean',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(17,'auth_security','check_have_i_been_pwned','true','boolean',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(18,'auth_security','password_history_count','5','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(19,'auth_security','password_expiry_days','90','integer',1,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(20,'auth_security','password_expiry_warning_days','7','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(21,'auth_security','session_lifetime_minutes','120','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(22,'auth_security','idle_timeout_admin_manager_minutes','30','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(23,'auth_security','idle_timeout_client_employee_minutes','60','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(24,'auth_security','idle_warning_before_minutes','2','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(25,'auth_security','max_concurrent_sessions_per_user','0','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(26,'auth_security','login_anomaly_alerts_enabled','true','boolean',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(27,'auth_security','invitation_expiry_hours','48','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(28,'auth_security','invitation_completion_throttle_attempts','3','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(29,'auth_security','invitation_completion_throttle_minutes','10','integer',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(30,'auth_security','force_password_change_on_first_login','true','boolean',1,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(31,'auth_security','audit_logging_enabled','true','boolean',1,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(32,'auth_security','mask_sensitive_data_in_logs','true','boolean',1,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(33,'auth_security','unmasked_export_requires_confirmation','true','boolean',0,NULL,'2026-07-06 06:31:48','2026-07-06 06:31:48'),(34,'email','smtp_host','smtp.gmail.com','string',0,64,'2026-07-06 06:31:48','2026-07-06 08:00:22'),(35,'email','smtp_port','587','integer',0,64,'2026-07-06 06:31:48','2026-07-06 08:00:22'),(36,'email','smtp_username','nithidharan24@gmail.com','string',0,64,'2026-07-06 06:31:48','2026-07-06 08:00:22'),(37,'email','smtp_password','lrvkgyiabydqmljy','string',0,64,'2026-07-06 08:00:22','2026-07-06 08:00:22'),(38,'email','from_address','nithidharan24@gmail.com','string',0,64,'2026-07-06 08:00:22','2026-07-06 08:00:22'),(39,'email','from_name','TECLA_PAYROLL','string',0,64,'2026-07-06 08:00:22','2026-07-06 08:00:22');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','manager','client','employee') NOT NULL DEFAULT 'employee',
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `employee_id` bigint(20) unsigned DEFAULT NULL,
  `client_id` bigint(20) unsigned DEFAULT NULL,
  `status` enum('active','suspended','invited','locked') NOT NULL DEFAULT 'invited',
  `suspended_reason` varchar(255) DEFAULT NULL,
  `recovery_email` varchar(255) DEFAULT NULL,
  `failed_login_attempts` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `locked_until` timestamp NULL DEFAULT NULL,
  `password_changed_at` timestamp NULL DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 1,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL,
  `invitation_token` varchar(64) DEFAULT NULL,
  `invitation_expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_invitation_token_unique` (`invitation_token`),
  KEY `users_employee_id_foreign` (`employee_id`),
  KEY `users_client_id_foreign` (`client_id`),
  CONSTRAINT `users_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (5,'Test User','test@example.com','2026-07-06 06:31:47','$2y$12$TBoxjx0edYbVM4CQDUJO8OfKRF6.mNoHuUfJPSHi4e5FFhfA3O0sW','employee','wRLLRPBXDi','2026-07-06 06:31:48','2026-07-06 06:31:48',NULL,NULL,'invited',NULL,NULL,0,NULL,NULL,1,NULL,NULL,NULL,NULL),(60,'Iliana Stokes Jr.','koss.brandy@example.org','2026-07-06 07:41:38','$2y$12$uos80Gwkr6Edb3iGnAHOuOjvHvN7lbBjVMO3lZUFf.oy/WpjT9a86','manager','MNqJbzPTHG','2026-07-06 07:41:39','2026-07-06 07:41:39',NULL,NULL,'invited',NULL,NULL,0,NULL,NULL,1,NULL,NULL,NULL,NULL),(61,'Mr. Luigi Fadel DVM','hodkiewicz.furman@example.com','2026-07-06 07:41:39','$2y$12$uos80Gwkr6Edb3iGnAHOuOjvHvN7lbBjVMO3lZUFf.oy/WpjT9a86','admin','iNRlRzYjy7','2026-07-06 07:41:39','2026-07-06 07:41:39',NULL,NULL,'invited',NULL,NULL,0,NULL,NULL,1,NULL,NULL,NULL,NULL),(64,'Admin User','mavicjesh481@gmail.com',NULL,'$2y$12$OB6JP77bNJvaWtZnrQlCZO6Ie52vj8fw/V6KzXC8wWo6PHYX3ibta','admin',NULL,'2026-07-06 07:51:04','2026-07-06 23:07:41',NULL,NULL,'active',NULL,NULL,0,NULL,'2026-07-06 07:58:37',0,'2026-07-06 23:07:41','127.0.0.1',NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-07 10:47:21
