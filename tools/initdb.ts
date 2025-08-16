import { Environment } from "../src/shared/helpers/Environment";
import { ConnectionManager } from "../src/shared/infrastructure/ConnectionManager";
import { DatabaseUrlParser } from "../src/shared/helpers/DatabaseUrlParser";
import * as fs from "fs";
import * as path from "path";

// Module initialization order - membership first for auth dependencies
const moduleOrder = ['membership', 'attendance', 'content', 'giving', 'messaging', 'doing'];

interface InitOptions {
  module?: string;
  reset?: boolean;
  environment?: string;
}

async function initializeDatabases(options: InitOptions = {}) {
  try {
    const environment = options.environment || process.env.ENVIRONMENT || 'dev';
    await Environment.init(environment);

    if (options.reset) {
      console.log('🔥 Resetting all databases...');
      await resetDatabases();
      return;
    }

    if (options.module) {
      console.log(`🔧 Initializing ${options.module} database...`);
      await initializeModuleDatabase(options.module);
      console.log(`✅ ${options.module} database initialization completed!`);
      return;
    }

    console.log('🚀 Initializing Core API databases...');
    console.log(`📋 Module order: ${moduleOrder.join(' → ')}`);
    
    for (const moduleName of moduleOrder) {
      console.log(`\n🔧 Initializing ${moduleName} database...`);
      await initializeModuleDatabase(moduleName);
    }
    
    console.log('\n✅ All databases initialized successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await ConnectionManager.closeAll();
  }
}

async function initializeModuleDatabase(moduleName: string) {
  try {
    const dbConfig = Environment.getDatabaseConfig(moduleName);
    if (!dbConfig) {
      console.log(`⚠️  No database configuration found for ${moduleName}, skipping...`);
      return;
    }

    // Ensure the database exists
    await ensureDatabaseExists(moduleName, dbConfig);

    const scriptsPath = path.join(__dirname, 'dbScripts', moduleName);
    
    if (!fs.existsSync(scriptsPath)) {
      console.log(`⚠️  No database scripts found for ${moduleName} at ${scriptsPath}, skipping...`);
      return;
    }

    // Create ApiHelper pool for executing SQL statements
    const { Pool } = require('@churchapps/apihelper');
    let pool: any = null;

    // Get all SQL files in the module directory
    const files = fs.readdirSync(scriptsPath)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Execute in alphabetical order

    if (files.length === 0) {
      console.log(`⚠️  No SQL files found for ${moduleName}, skipping...`);
      return;
    }

    console.log(`   📁 Found ${files.length} SQL files for ${moduleName}`);

    // Initialize the pool
    pool = new Pool(dbConfig.host, dbConfig.user, dbConfig.password, dbConfig.database, dbConfig.connectionLimit || 10, dbConfig.port || 3306);

    for (const file of files) {
      const filePath = path.join(scriptsPath, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`   📄 Executing: ${file}`);
      
      // Skip files with placeholder content
      if (sql.includes('-- This file will be populated') || sql.trim().length < 50) {
        console.log(`   ⏭️  Skipping placeholder file: ${file}`);
        continue;
      }
      
      // Split SQL file by statements and handle various SQL delimiters
      const statements = splitSqlStatements(sql);

      for (const statement of statements) {
        const cleanStatement = statement.trim();
        if (cleanStatement && !cleanStatement.startsWith('--')) {
          try {
            await pool.executeQuery(cleanStatement);
          } catch (error) {
            console.error(`   ❌ Failed to execute statement in ${file}:`, error);
            console.error(`   Statement: ${cleanStatement.substring(0, 100)}...`);
            throw error;
          }
        }
      }
    }

    console.log(`   ✅ ${moduleName} database initialized successfully`);
  } catch (error) {
    console.error(`   ❌ Failed to initialize ${moduleName} database:`, error);
    throw error;
  } finally {
    // Close the pool if it was created
    if (pool) {
      await pool.close();
    }
  }
}

async function ensureDatabaseExists(moduleName: string, dbConfig: any) {
  const { Pool } = require('@churchapps/apihelper');
  
  // Connect without specifying database to create it if needed
  const tempPool = new Pool(
    dbConfig.host,
    dbConfig.user,
    dbConfig.password,
    '', // No database specified
    1, // Single connection for creation
    dbConfig.port || 3306
  );

  try {
    console.log(`   🏗️  Ensuring database '${dbConfig.database}' exists...`);
    await tempPool.executeQuery(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    console.log(`   ✅ Database '${dbConfig.database}' ready`);
  } catch (error) {
    console.error(`   ❌ Failed to ensure database exists for ${moduleName}:`, error);
    throw error;
  } finally {
    await tempPool.close();
  }
}

function splitSqlStatements(sql: string): string[] {
  // Handle both ; and $$ delimiters for procedures/functions
  const statements: string[] = [];
  let current = '';
  let inDelimiter = false;
  
  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip comments
    if (trimmedLine.startsWith('--') || trimmedLine.startsWith('/*') || trimmedLine === '') {
      continue;
    }
    
    current += line + '\n';
    
    // Check for delimiter changes
    if (trimmedLine.includes('DELIMITER $$')) {
      inDelimiter = true;
      continue;
    }
    
    if (trimmedLine.includes('DELIMITER ;')) {
      inDelimiter = false;
      continue;
    }
    
    // End of statement
    if ((!inDelimiter && trimmedLine.endsWith(';')) || 
        (inDelimiter && trimmedLine.includes('$$'))) {
      if (current.trim()) {
        statements.push(current.trim());
        current = '';
      }
    }
  }
  
  // Add any remaining content
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements.filter(stmt => stmt.length > 0);
}

async function resetDatabases() {
  console.log('⚠️  WARNING: This will drop and recreate all databases!');
  console.log('   This action cannot be undone.');
  
  for (const moduleName of moduleOrder) {
    const dbConfig = Environment.getDatabaseConfig(moduleName);
    if (!dbConfig) {
      console.log(`⏭️  No configuration for ${moduleName}, skipping...`);
      continue;
    }

    console.log(`\n🗑️  Resetting ${moduleName} database...`);
    await resetModuleDatabase(moduleName, dbConfig);
    
    console.log(`🔧 Re-initializing ${moduleName} database...`);
    await initializeModuleDatabase(moduleName);
  }
  
  console.log('\n🔥 Database reset completed!');
}

async function resetModuleDatabase(moduleName: string, dbConfig: any) {
  const { EnhancedPoolHelper } = require('@churchapps/apihelper');
  
  const tempPool = new EnhancedPoolHelper(
    dbConfig.host,
    dbConfig.user,
    dbConfig.password,
    '', // No database specified
    1,
    dbConfig.port || 3306
  );

  try {
    console.log(`   🗑️  Dropping database '${dbConfig.database}'...`);
    await tempPool.executeQuery(`DROP DATABASE IF EXISTS \`${dbConfig.database}\``);
    
    console.log(`   🏗️  Creating database '${dbConfig.database}'...`);
    await tempPool.executeQuery(`CREATE DATABASE \`${dbConfig.database}\``);
    
    console.log(`   ✅ ${moduleName} database reset completed`);
  } catch (error) {
    console.error(`   ❌ Failed to reset ${moduleName} database:`, error);
    throw error;
  } finally {
    await tempPool.close();
  }
}

function parseArguments(): InitOptions {
  const args = process.argv.slice(2);
  const options: InitOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--module=')) {
      options.module = arg.split('=')[1];
    } else if (arg === '--reset') {
      options.reset = true;
    } else if (arg.startsWith('--environment=')) {
      options.environment = arg.split('=')[1];
    }
  }

  // Validate module name if provided
  if (options.module && !moduleOrder.includes(options.module)) {
    console.error(`❌ Invalid module: ${options.module}`);
    console.error(`   Valid modules: ${moduleOrder.join(', ')}`);
    process.exit(1);
  }

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArguments();
  initializeDatabases(options);
}