import { RedisClient, createClient } from "redis";
import { ProjectConfig } from "./config";
import { Logger } from "./logging";
import { RequestHandler } from "express";
import { SessionOptions } from 'express-session';
import * as ExpressSession from 'express-session';
import * as connect from 'connect-redis';

const logger: Logger = new Logger('session');
export { logger as sessionLogger }

export class Session {
  /**
   * Configuration object which issued this Session object
   */
  readonly config: ProjectConfig;
  readonly type: 'redis';
  /**
   * Represents the client (which connects to the redis server)
   * Hence the "connection"
   */
  readonly connection?: RedisClient;
  readonly middleware: RequestHandler;

  readonly sessionInitializer?: (session: Express.Session) => void;

  close() {
    if (this.connection) {
      this.connection.quit();
      logger.info('The session connection has closed');
    }
  }

  constructor(config: ProjectConfig, connection: RedisClient) {
    // logger.info('Initializing session...');

    this.config = config;
    this.type = config.sessionType;
    if (config.sessionInitializer) {
      this.sessionInitializer = config.sessionInitializer;
    }

    this.connection = connection;

    const options: SessionOptions = {
      store: new (connect(ExpressSession))({ client: this.connection }),
      secret: 'thisissecret',
      resave: false,
      saveUninitialized: false
    }

    if (this.config.sessionCookieDomain) {
      options.cookie = {
        domain: this.config.sessionCookieDomain
      }
      logger.info(`Using ${this.config.sessionCookieDomain} for the session cookie domain`);
    }
    else {
      logger.warn(`No session cookie domain set. Using "${this.config.localHostname}"`);
    }

    this.middleware = ExpressSession(options);
  }

  static async get(config: ProjectConfig): Promise<Session> {
    return new Promise<Session>((resolve, reject) => {
      logger.info('Connection to the redis server...');
      const client: RedisClient = createClient(config.sessionPort, config.sessionHost, { connect_timeout: 100 });
      client.on('ready', () => {
        resolve(new Session(config, client));
        logger.success('Successful connection to the server');
      });
      client.on('error', (e: Error) => {
        logger.error('Can\'t connect to the redis server')
        // client.quit();
        reject(e);
      });
      client.on('end', () => {
        logger.log('Connection to the redis server has closed')
      })
    });
  }
}
