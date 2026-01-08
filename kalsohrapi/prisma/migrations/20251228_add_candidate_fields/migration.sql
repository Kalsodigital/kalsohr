-- Add missing fields to candidates table
ALTER TABLE `candidates`
ADD COLUMN `alternatePhone` VARCHAR(20) NULL AFTER `phone`,
ADD COLUMN `dateOfBirth` DATETIME(3) NULL AFTER `alternatePhone`,
ADD COLUMN `genderId` INTEGER NULL AFTER `dateOfBirth`,
ADD COLUMN `maritalStatusId` INTEGER NULL AFTER `genderId`,
ADD COLUMN `currentAddress` TEXT NULL AFTER `maritalStatusId`,
ADD COLUMN `permanentAddress` TEXT NULL AFTER `currentAddress`,
ADD COLUMN `cityId` INTEGER NULL AFTER `permanentAddress`,
ADD COLUMN `postalCode` VARCHAR(20) NULL AFTER `cityId`,
ADD COLUMN `educationLevel` VARCHAR(100) NULL AFTER `qualifications`,
ADD COLUMN `fatherName` VARCHAR(100) NULL AFTER `postalCode`,
ADD COLUMN `fatherOccupation` VARCHAR(100) NULL AFTER `fatherName`,
ADD COLUMN `fatherContact` VARCHAR(20) NULL AFTER `fatherOccupation`,
ADD COLUMN `motherName` VARCHAR(100) NULL AFTER `fatherContact`,
ADD COLUMN `motherOccupation` VARCHAR(100) NULL AFTER `motherName`,
ADD COLUMN `motherContact` VARCHAR(20) NULL AFTER `motherOccupation`,
ADD COLUMN `familyAddress` TEXT NULL AFTER `motherContact`,
ADD COLUMN `emergencyContactName` VARCHAR(100) NULL AFTER `familyAddress`,
ADD COLUMN `emergencyContactPhone` VARCHAR(20) NULL AFTER `emergencyContactName`,
ADD COLUMN `referredBy` VARCHAR(255) NULL AFTER `source`,
ADD COLUMN `notes` TEXT NULL AFTER `referredBy`,
ADD COLUMN `createdBy` INTEGER NULL AFTER `updatedAt`,
ADD COLUMN `updatedBy` INTEGER NULL AFTER `createdBy`;

-- Add foreign key constraints
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_genderId_fkey` FOREIGN KEY (`genderId`) REFERENCES `genders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_maritalStatusId_fkey` FOREIGN KEY (`maritalStatusId`) REFERENCES `marital_statuses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
