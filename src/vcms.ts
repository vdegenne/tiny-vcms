import { ProjectConfig } from "./config";
import { Logger } from "./logging";
import { Database } from "./database";
import { Session } from "./session";
import * as path from 'path';
import * as express from 'express';
import * as http from 'spdy';
import { Server } from "./server";

export { Router } from 'express';
export { CreamModel } from './models/objection-cream';
export { RelationMappings } from 'objection';

const logger: Logger = new Logger('vcms');
export { logger as vcmsLogger };

export { VcmsOptions } from './config';

export interface appOptions {
  root?: string,
  optionsFilepath?: string,
  scriptFilepath?: string
}

export class Vcms {
  readonly options: appOptions;
  readonly args: string[];
  config: ProjectConfig;
  database: Database;
  session: Session;
  server: http.Server;

  constructor(args: string[], options?: appOptions) {
    options
    /**
     * TODO : Implement the verbose and quiet option to hide the output
     * (see polymer-cli github for more details)
     */
    this.args = args;


    /**
     * TODO : allow user to specify the base from command line
     */
    // console.log(commandLineArgs(<commandLineArgs.ArgDescriptor>{}));
    this.options = options || { root: process.cwd() };
  }

  async run() {
    const optionsFilepath = path.join(this.options.root!, this.options.optionsFilepath || '');
    const scriptFilepath = path.join(this.options.root!, this.options.scriptFilepath || '');
    this.config = await ProjectConfig.get(this.args, optionsFilepath, scriptFilepath);

    if (this.config.databaseRequired) {
      this.database = new Database(this.config);
      await this.database.checkConnection(); // check if the connection is successful
    }

    if (this.config.sessionRequired) {
      this.session = await Session.get(this.config);
    }

    /* should start the server right here */
    const app: express.Application = Server.createApp(this.config, this.session);
    this.server = <http.Server>await Server.get(this.config, app);
  }

  async destroy() {
    if (this.database) {
      await this.database.closeConnection();
    }
    if (this.session) {
      await this.session.close();
    }
  }
}
