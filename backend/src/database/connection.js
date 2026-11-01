const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config/config');

let dbInstance = null;

function getDatabase(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || config.database.filename;
  const db = new DatabaseSync(dbPath);

  // Habilitar claves foráneas y WAL mode para concurrencia
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  // Ejecutar esquema inicial
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

module.exports = {
  getDatabase
};
