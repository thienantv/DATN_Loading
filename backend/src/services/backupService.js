const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const db = require('../config/database');

const BACKUP_DIR = path.join(__dirname, '../../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const backupService = {
  // Create a backup of the database
  async createBackup() {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `shrimp_db_${timestamp}.sql`;
      const backupPath = path.join(BACKUP_DIR, backupName);

      // Get database connection details from environment
      const dbConfig = {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'shrimp_db',
      };

      // Build pg_dump command
      let dumpCommand = `pg_dump -U ${dbConfig.user} -h ${dbConfig.host} -p ${dbConfig.port} ${dbConfig.database} > "${backupPath}"`;
      
      // If password is set, add it to environment
      const env = { ...process.env };
      if (dbConfig.password) {
        env.PGPASSWORD = dbConfig.password;
      }

      exec(dumpCommand, { env }, (error) => {
        if (error) {
          logger.error('Backup error:', error);
          reject(new Error('Failed to create backup: ' + error.message));
          return;
        }

        // Create metadata file
        const metadata = {
          name: backupName,
          createdAt: new Date().toISOString(),
          size: fs.statSync(backupPath).size,
          description: 'Auto-generated database backup'
        };

        fs.writeFileSync(
          path.join(BACKUP_DIR, backupName.replace('.sql', '.json')),
          JSON.stringify(metadata, null, 2)
        );

        logger.info('Backup created:', backupName);
        resolve(metadata);
      });
    });
  },

  // Get list of available backups
  async getBackups() {
    try {
      const files = fs.readdirSync(BACKUP_DIR);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const metadataPath = path.join(BACKUP_DIR, file);
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          backups.push({
            id: metadata.name.replace('.sql', ''),
            ...metadata
          });
        }
      }

      return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      logger.error('Error reading backups:', error);
      return [];
    }
  },

  // Restore from a backup
  async restoreBackup(backupName) {
    return new Promise((resolve, reject) => {
      const backupPath = path.join(BACKUP_DIR, `${backupName}.sql`);

      if (!fs.existsSync(backupPath)) {
        reject(new Error('Backup file not found'));
        return;
      }

      // Get database connection details
      const dbConfig = {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'shrimp_db',
      };

      // Build psql command - drop and recreate database first
      const dropCommand = `psql -U ${dbConfig.user} -h ${dbConfig.host} -p ${dbConfig.port} -tc "DROP DATABASE IF EXISTS ${dbConfig.database};"`;
      const createCommand = `psql -U ${dbConfig.user} -h ${dbConfig.host} -p ${dbConfig.port} -tc "CREATE DATABASE ${dbConfig.database};"`;
      const restoreCommand = `psql -U ${dbConfig.user} -h ${dbConfig.host} -p ${dbConfig.port} ${dbConfig.database} < "${backupPath}"`;

      const env = { ...process.env };
      if (dbConfig.password) {
        env.PGPASSWORD = dbConfig.password;
      }

      // Execute restoration sequence
      exec(dropCommand, { env }, (error1) => {
        if (error1) {
          logger.error('Error dropping database:', error1);
          reject(new Error('Failed to drop database'));
          return;
        }

        exec(createCommand, { env }, (error2) => {
          if (error2) {
            logger.error('Error creating database:', error2);
            reject(new Error('Failed to create database'));
            return;
          }

          exec(restoreCommand, { env }, (error3) => {
            if (error3) {
              logger.error('Error restoring backup:', error3);
              reject(new Error('Failed to restore backup: ' + error3.message));
              return;
            }

            logger.info('Database restored from backup:', backupName);
            resolve({
              success: true,
              message: `Database restored from ${backupName}`,
              restoredAt: new Date().toISOString()
            });
          });
        });
      });
    });
  },

  // Delete a backup
  async deleteBackup(backupName) {
    try {
      const backupPath = path.join(BACKUP_DIR, `${backupName}.sql`);
      const metadataPath = path.join(BACKUP_DIR, `${backupName}.json`);

      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      logger.info('Backup deleted:', backupName);
      return { success: true, message: 'Backup deleted successfully' };
    } catch (error) {
      logger.error('Error deleting backup:', error);
      throw error;
    }
  },

  // Get backup size info
  async getBackupSize(backupName) {
    try {
      const backupPath = path.join(BACKUP_DIR, `${backupName}.sql`);
      if (!fs.existsSync(backupPath)) {
        return 0;
      }
      return fs.statSync(backupPath).size;
    } catch (error) {
      logger.error('Error getting backup size:', error);
      return 0;
    }
  },
};

module.exports = backupService;
