const { Sequelize } = require('sequelize');
const config = require('../config/database');
const env = require('../config/env');

const environment = env.NODE_ENV || 'development';
const dbConfig = config[environment];

let sequelize;
if (dbConfig.url) {
  sequelize = new Sequelize(dbConfig.url, dbConfig);
} else {
  sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);
}

const db = {};

// Import models
db.User = require('./User')(sequelize, Sequelize.DataTypes);
db.RefreshToken = require('./RefreshToken')(sequelize, Sequelize.DataTypes);

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db; 