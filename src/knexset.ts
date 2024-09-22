import type { Knex } from "knex";
import path from 'path';

// Define a configuration object for database connections
const config: { [key: string]: Knex.Config } = {
  development: {
    // Specify SQLite as the database client
    client: "sqlite3",
    connection: {
      // Define the path to the SQLite database file
      filename: path.resolve(__dirname, '../out01/database.sqlite')
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.resolve(__dirname, 'migrations')
    },
    // Configure the connection pool
    pool: {
      min: 2,
      max: 20
    }
  }
};

export default config;