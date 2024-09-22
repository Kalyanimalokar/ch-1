import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import path from 'path';
import knex from 'knex';
import config from './knexset';

// Initialize database connection using the development configuration
const db = knex(config.development);

// Function to check and verify database connection
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Utility function to create a delay, useful for retry mechanisms
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// Function to retry database operations with exponential backoff
async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 5, delayMs = 1000): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Attempt to execute the provided operation
      return await operation();
    } catch (error: any) {
      // If database is locked and we haven't exceeded max retries, wait and try again
      if (error.code === 'SQLITE_BUSY' && attempt < maxRetries) {
        console.log(`Database locked, retrying in ${delayMs}ms... (Attempt ${attempt}/${maxRetries})`);
        await delay(delayMs);
      } else {
        // If it's not a locking issue or we've exceeded retries, throw the error
        throw error;
      }
    }
  }
  // If all retries fail, throw a final error
  throw new Error(`Operation failed after ${maxRetries} attempts`);
}


// Function to process CSV file and insert data into the specified database table
async function processCSVStream(filePath: string, tableName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Configure CSV parser
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
    });

    let records: any[] = [];
    let totalInserted = 0;

    // Create read stream from CSV file and pipe it through the parser
    createReadStream(filePath)
      .pipe(parser)
      .on('data', (record) => {
        // Accumulate records in memory
        records.push(record);
      })
      .on('end', async () => {
        try {
          // Use retry mechanism for the database insertion
          await retryOperation(async () => {
            // Wrap the entire insertion process in a transaction
            await db.transaction(async (trx) => {
              // Insert each record into the database
              for (const record of records) {
                await trx(tableName).insert(record);
                totalInserted++;
                // Log progress every 1000 records
                if (totalInserted % 1000 === 0) {
                  console.log(`Inserted ${totalInserted} records into ${tableName}`);
                }
              }
            });
          });
          console.log(`Finished inserting ${totalInserted} records into ${tableName}`);
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        // Handle any errors during CSV processing
        reject(error);
      });
  });
}

// Main function to orchestrate the entire data insertion process
async function main() {
  try {
    // Check database connection before proceeding
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.error('Exiting due to database connection failure');
      return;
    }
    
    // Process and insert customer data
    console.log('Starting to insert customers');
    await processCSVStream(path.resolve(__dirname, '../tmp/extracted/dump/customers.csv'), 'customers');

    // Process and insert organization data
    console.log('Starting to insert organizations');
    await processCSVStream(path.resolve(__dirname, '../tmp/extracted/dump/organizations.csv'), 'organizations');

    console.log('All data insertion completed');

    // Verify data insertion by counting records in each table
    const customerCount = await db('customers').count('* as count').first();
    const orgCount = await db('organizations').count('* as count').first();
    console.log(`Customers in database: ${customerCount?.count}`);
    console.log(`Organizations in database: ${orgCount?.count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Ensure database connection is closed, even if an error occurred
    await db.destroy();
    console.log('Database connection closed');
  }
}

// Execute the main function
main();


// The current code is simpler and more efficient. I switched to this approach because 
// the previous version kept running into "database locked" errors. 
// Now, the code uses features in a functional style, 
// making it easier to maintain. It handles CSV files by streaming, which is better for large files, 
// and includes improved error handling with retries for temporary database issues.

// Database inserts are wrapped in transactions for data safety, 
// and the code provides regular progress updates during long tasks. 
// The use of async/await makes asynchronous operations clearer, and 
// it ensures the database connection always closes properly. 
// Overall, this approach is more reliable and avoids the issues I encountered earlier.



///////////////////////// Earlier attempt to create a users table/////////////////

// // import fs from 'fs';
// // import csv from 'csv-parser';
// // import knex from 'knex';
// // import config from './knexset';

// // const db = knex(config.development);

// // // Example: Create a table
// // db.schema.createTable("users", (table) => {
// //   table.increments("id");
// //   table.string("name");
// //   table.string("email");
// // }).then(() => {
// //   console.log("Users table created");
// // }).catch((error) => {
// //   console.error("Error creating users table:", error);
// // }).finally(() => {
// //   db.destroy();
// // });


////////////////////// Alternative approach using TypeScript interfaces and batch inserts////////////////////////////////////

/////// This code was breaking////////////////// This code was more complex and type-safe but had issues////////////////////
// import fs from 'fs';
// import csv from 'csv-parser';
// import knex, { Knex } from 'knex';
// import knexConfig from './knexset';
// import path from 'path';

// interface CustomerRow {
//   'Index': number;
//   'Customer Id': string;
//   'First Name': string;
//   'Last Name': string;
//   'Company': string;
//   'City': string;
//   'Country': string;
//   'Phone 1': string;
//   'Phone 2': string;
//   'Email': string;
//   'Subscription Date': Date;
//   'Website': string;
// }

// interface OrganizationRow {
//   'Index': number;
//   'Organization Id': string;
//   'Name': string;
//   'Website': string;
//   'Country': string;
//   'Description': string;
//   'Founded': number;
//   'Industry': string;
//   'Number of employees': number;
// }

// type ColumnTypes = {
//   [key: string]: 'string' | 'integer' | 'datetime';
// };

// const BATCH_SIZE = 100; // Increased batch size for better performance

// async function connectToDatabase(): Promise<Knex> {
//   const db = knex(knexConfig.development);
//   await db.raw('SELECT 1');
//   console.log('Database connected successfully.');
//   return db;
// }

// async function insertBatch(db: Knex, tableName: string, batch: any[]): Promise<void> {
//   try {
//     await db.transaction(async (trx) => {
//       await trx(tableName).insert(batch);
//     });
//     console.log(`Inserted ${batch.length} rows into ${tableName}`);
//   } catch (error) {
//     console.error(`Error inserting batch into ${tableName}:`, error);
//     throw error; // Rethrow the error to stop the process
//   }
// }

// function sanitizeValue(value: any): any {
//   if (typeof value === 'string') {
//     return value.replace(/['";]/g, '');
//   }
//   return value;
// }

// async function processCSV<T extends object>(db: Knex, filePath: string, tableName: string, columnTypes: ColumnTypes): Promise<void> {
//   return new Promise((resolve, reject) => {
//     let batch: T[] = [];
//     let rowCount = 0;

//     fs.createReadStream(filePath)
//       .pipe(csv())
//       .on('data', (row: T) => {
//         Object.keys(row).forEach(key => {
//           if (columnTypes[key] === 'integer') {
//             (row as any)[key] = parseInt(sanitizeValue((row as any)[key]), 10) || 0;
//           } else if (columnTypes[key] === 'datetime') {
//             const date = new Date(sanitizeValue((row as any)[key]));
//             (row as any)[key] = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
//           } else {
//             (row as any)[key] = sanitizeValue((row as any)[key]);
//           }
//         });

//         batch.push(row);
//         rowCount++;

//         if (batch.length >= BATCH_SIZE) {
//           insertBatch(db, tableName, batch)
//             .catch(error => {
//               console.error(`Error processing batch: ${error}`);
//               reject(error);
//             });
//           batch = [];
//         }
//       })
//       .on('end', async () => {
//         if (batch.length > 0) {
//           try {
//             await insertBatch(db, tableName, batch);
//           } catch (error) {
//             reject(error);
//             return;
//           }
//         }
//         console.log(`Finished processing ${rowCount} rows from ${filePath}`);
//         resolve();
//       })
//       .on('error', reject);
//   });
// }

// async function populateTables(): Promise<void> {
//   const customersColumnTypes: ColumnTypes = {
//     'Index': 'integer',
//     'Customer Id': 'string',
//     'First Name': 'string',
//     'Last Name': 'string',
//     'Company': 'string',
//     'City': 'string',
//     'Country': 'string',
//     'Phone 1': 'string',
//     'Phone 2': 'string',
//     'Email': 'string',
//     'Subscription Date': 'datetime',
//     'Website': 'string'
//   };

//   const organizationsColumnTypes: ColumnTypes = {
//     'Index': 'integer',
//     'Organization Id': 'string',
//     'Name': 'string',
//     'Website': 'string',
//     'Country': 'string',
//     'Description': 'string',
//     'Founded': 'integer',
//     'Industry': 'string',
//     'Number of employees': 'integer'
//   };

//   let dbInstance: Knex | null = null;
//   try {
//     dbInstance = await connectToDatabase();
//     await processCSV<CustomerRow>(dbInstance, path.resolve(__dirname, '../tmp/extracted/dump/customers.csv'), 'customers', customersColumnTypes);
//     await processCSV<OrganizationRow>(dbInstance, path.resolve(__dirname, '../tmp/extracted/dump/organizations.csv'), 'organizations', organizationsColumnTypes);
//     console.log('All data has been processed and inserted.');
//   } catch (error) {
//     console.error('Error processing CSV files:', error);
//   } finally {
//     if (dbInstance) {
//       await dbInstance.destroy();
//     }
//   }
// }

// populateTables();

/////////////////
