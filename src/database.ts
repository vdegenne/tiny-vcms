import { Logger } from "./logging";
import { ProjectConfig } from "./config";
import * as Knex from 'knex';
import { Model } from "objection";
const logger: Logger = new Logger('database');
export { logger as databaseLogger }


export class Database {
  readonly connection: Knex;

  async checkConnection() {
    try {
      await this.connection.raw('select 1+1 as result');
      return true;
    } catch (e) {
      return false;
    }
  }

  async closeConnection() {
    await this.connection.destroy();
  }

  constructor(config: ProjectConfig) {
    logger.info('Initializing the database...');

    if (!config.dbUser || !config.dbPassword) {
      logger.error('Database ident incorrect');
      throw new Error('Database ident incorrect !');
    }

    /* database name */
    if (!config.dbName) {
      logger.warn(`database name unspecified. Using "${config.dbUser}" as default`);
    }

    this.connection = Knex({
      client: config.dbType,
      connection: {
        host: config.dbHost,
        port: config.dbPort,
        user: config.dbUser,
        password: config.dbPassword,
        database: config.dbName || config.dbUser
      },
      /**
       * One instance of a connection is created when the database is requested
       * min and max set to 1 should
       */
      pool: {
        min: 1,
        max: 2,
        afterCreate: (connection: Knex.Client, done: any) => {
          logger.success(`Connection #${_connections.length + 1} has been created`);
          _connections.push(connection);
          done();
        },
        beforeDestroy: (connection: Knex.Client, done: any) => {
          const index = _connections.indexOf(connection);
          logger.warn(`Connection #${index + 1} closing...`);
          _connections.splice(index, 1);
          done();
        }
      }
    });

    // this line makes new made models automatically be mapped to the database
    Model.knex(this.connection);
  }
}

let _connections: Knex.Client[] = [];
