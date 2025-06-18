const knex = require('knex');
const env = require('./env');

// Sequelize configuration
const sequelizeConfig = {
  development: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    dialect: 'postgres',
    timezone: '+00:00', // Force UTC timezone
    logging: env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  },
  production: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    dialect: 'postgres',
    timezone: '+00:00', // Force UTC timezone
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
};

// Knex configuration
const knexConfig = {
  client: 'pg',
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 60000,
    idleTimeoutMillis: 600000,
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations'
  }
};

// Create Knex instance
const db = knex(knexConfig);

// Test database connection
async function testConnection() {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Initialize database tables
async function initializeTables() {
  try {
    // Check if reminders table exists
    const hasTable = await db.schema.hasTable('reminders');
    
    if (!hasTable) {
      console.log('Creating reminders table...');
      await db.schema.createTable('reminders', (table) => {
        table.uuid('id').primary();
        table.uuid('task_id').notNullable();
        table.uuid('user_id').notNullable();
        table.timestamp('due_date').notNullable();
        table.integer('remind_before').notNullable(); // minutes before due date
        table.timestamp('reminder_time').notNullable();
        table.boolean('sent').defaultTo(false);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        // Indexes for performance
        table.index(['task_id']);
        table.index(['user_id']);
        table.index(['reminder_time', 'sent']);
        table.index(['sent']);
      });
      
      console.log('✅ Reminders table created successfully');
    } else {
      console.log('✅ Reminders table already exists');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error.message);
    return false;
  }
}

// Graceful shutdown
async function closeConnection() {
  try {
    await db.destroy();
    console.log('✅ Database connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connection:', error.message);
  }
}

module.exports = sequelizeConfig[env.NODE_ENV || 'development'];

// Export additional utilities for Knex compatibility
module.exports.db = db;
module.exports.testConnection = testConnection;
module.exports.initializeTables = initializeTables;
module.exports.closeConnection = closeConnection; 