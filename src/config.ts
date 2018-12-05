import * as fs from 'fs';
import * as path from 'path';
import * as jsonschema from 'jsonschema';
import { RequestHandler, Router } from 'express';

import commandArgs from './args';

import * as yaml from 'js-yaml';
import { dashToCamelCase, fileExists } from './util';

import * as commandLineArgs from 'command-line-args';
import { Logger } from './logging';

/**
 * TODO: ParseAliases function
 */

const logger = new Logger('config');

export type NodeEnv = 'test' | 'dev' | 'prod';
export interface Static {
  route: string | RegExp | undefined,
  serve: string
}
export type Routers = { [base: string]: (Router | RequestHandler | any) };


export interface VcmsOptions {
  nodeEnv?: NodeEnv;
  port?: number;
  localHostname?: string;

  http2Required?: boolean;
  http2Key?: string;
  http2Cert?: string;

  databaseRequired?: boolean;
  dbType?: 'pg';
  dbHost?: string;
  dbPort?: number;
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;

  sessionRequired?: boolean;
  sessionType?: 'redis';
  sessionHost?: string;
  sessionPort?: number;
  sessionCookieDomain?: string;

  configFilePath?: string;
  routers?: Routers;
  sessionInitializer?: (session: Express.Session) => void;
  statics?: Static[];
  middlewares?: RequestHandler[];
}

export function parseAliases(object: any): VcmsOptions {
  const options = Object.assign({}, object);
  if (options.database) {
    options.databaseRequired = options.database;
    delete options.database;
  }
  if (options.session) {
    options.sessionRequired = options.session;
    delete options.session;
  }

  if (options.static) {
    options.statics = [<Static>{
      route: undefined,
      serve: options.static
    }];
    delete options.static;
  }

  return options;
}


/**
 * Shallowly copies an object, converting keys from dash-case to camelCase.
 */
function objectDashToCamelCase<V>(input: { [key: string]: V }) {
  const output: { [key: string]: V } = {};
  for (const key of Object.keys(input)) {
    output[dashToCamelCase(key)] = input[key];
  }
  return output;
}


export const YAML_FILENAME = '.vcms.yml';
export const SCRIPT_FILENAME = 'startup.js';

export class ProjectConfig {
  readonly nodeEnv: NodeEnv = 'prod';
  readonly port: number = 8000;
  readonly localHostname: string = 'localhost';
  readonly configFilePath?: string;

  readonly http2Required: boolean = false;
  readonly http2Key: string = './server.key';
  readonly http2Cert: string = './server.crt';

  readonly databaseRequired: boolean = false;
  readonly dbHost: string = 'localhost';
  readonly dbType: 'pg' = 'pg';
  readonly dbPort?: number = 5432;
  readonly dbName?: string;
  readonly dbUser?: string;
  readonly dbPassword?: string;

  readonly sessionRequired: boolean = false;
  readonly sessionType: 'redis' = 'redis';
  readonly sessionHost: string = 'localhost';
  readonly sessionPort: number = 6379;
  readonly sessionCookieDomain?: string;
  readonly sessionInitializer?: (session: Express.Session) => void;

  readonly statics?: Static[];
  readonly middlewares?: RequestHandler[];
  readonly routers?: Routers;


  static async loadOptionsFromScript(filepath?: string, media?: VcmsOptions): Promise<VcmsOptions> {
    filepath = filepath || process.cwd();

    if (!fileExists(filepath) && !fileExists(path.join(filepath, SCRIPT_FILENAME))) {
      const scripts = ['lib', 'build'].filter(l => fs.existsSync(path.join(<string>filepath, l, SCRIPT_FILENAME)));
      if (scripts.length < 1) {
        logger.warn('no script file was found, proceeding');
        return {};
      }
      else {
        filepath = path.join(filepath, scripts[0], SCRIPT_FILENAME); // load the first script file found
      }
    }

    if (!filepath.endsWith('.js')) {
      filepath = path.join(filepath, SCRIPT_FILENAME);
    }

    media = media || { nodeEnv: <NodeEnv>process.env.NODE_ENV || 'prod' }

    const script = require(path.resolve(filepath)).default;

    if (typeof script !== 'function') {
      // logger.error('the script file has no default export');
      throw new Error('the script file has no default export');
    }

    const options: VcmsOptions = script(media);
    // ProjectConfig.validateOptions(options);

    return options;
  }

  static async loadCommandLineOptions(args: string[]): Promise<VcmsOptions> {
    let parsedArgs;
    let options: VcmsOptions = {};

    try {
      parsedArgs = commandLineArgs(commandArgs, { argv: args || [] });
    } catch (error) {
      if (error.name === 'UNKNOWN_OPTION') {
        logger.warn(`The option ${error.optionName.split('=')[0]} is invalid`);
        return {};
      }
    }

    const parsedOptions = parseAliases(parsedArgs);
    options = Object.assign({}, parsedOptions, options);

    return <VcmsOptions>objectDashToCamelCase(<any>options);
  }

  static async get(args?: string[], optionFilepath?: string, scriptFilepath?: string): Promise<ProjectConfig> {

    /* set the node_env first */
    let options: VcmsOptions = { nodeEnv: <NodeEnv>process.env.NODE_ENV || 'prod' };


    /**
     * Precedence :
     * - config file
     * - command line arguments
     * - script
     */

    /* config file */
    options = mergeOptions(options, await this.loadOptionsFromFile(optionFilepath));

    /* command line arguments */
    if (args) {
      options = mergeOptions(options, await this.loadCommandLineOptions(args));
    }

    /* script file */
    options = mergeOptions(options, await this.loadOptionsFromScript(scriptFilepath, options));


    return new ProjectConfig(options);
  }

  /**
   * Returns the given configJsonObject if it is a valid ProjectOptions object,
   * otherwise throws an informative error message.
   */
  static validateOptions(configJsonObject: {}): VcmsOptions {
    const validator = new jsonschema.Validator();
    const result = validator.validate(configJsonObject, getSchema());
    if (result.errors.length > 0) {
      const error = result.errors[0]!;
      if (!error.property && !error.message) {
        throw error;
      }
      let propertyName = error.property;
      if (propertyName.startsWith('instance.')) {
        propertyName = propertyName.slice(9);
      }
      throw new Error(`Property '${propertyName}' ${error.message}`);
    }
    return configJsonObject;
  }


  static loadOptionsFromFile(filepath?: string, nodeEnv?: NodeEnv): VcmsOptions {
    filepath = filepath || process.cwd();
    if (!filepath.endsWith('.yml') && !filepath.endsWith('.yaml')) {
      filepath += `${path.sep}${YAML_FILENAME}`;
    }

    nodeEnv = nodeEnv || <NodeEnv>process.env.NODE_ENV || 'prod';

    try {
      const fileOptions = yaml.safeLoad(fs.readFileSync(filepath, 'utf-8'));
      let options: VcmsOptions = [fileOptions].map(({ prod, dev, test, ...others }) => ({ ...others }))[0];
      options = objectDashToCamelCase(<{}>options);
      if (fileOptions[nodeEnv]) {
        options = { ...options, ...objectDashToCamelCase(<{}>fileOptions[nodeEnv]) };
      }
      options = parseAliases(options);
      return this.validateOptions(options);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        logger.warn('no config file was find, proceeding...');
        return {};
      }

      throw error;
    }
  }

  constructor(options?: VcmsOptions) {
    options = options || {};

    /* everything is overridable */
    if (options.nodeEnv) { this.nodeEnv = options.nodeEnv }
    if (options.port) { this.port = options.port }
    if (options.localHostname) { this.localHostname = options.localHostname }
    if (options.configFilePath) { this.configFilePath = options.configFilePath }

    // http2
    if (options.http2Required) { this.http2Required = options.http2Required }
    if (options.http2Key) { this.http2Key = options.http2Key }
    if (options.http2Cert) { this.http2Cert = options.http2Cert }

    // database
    if (options.databaseRequired) { this.databaseRequired = options.databaseRequired }
    if (options.dbType) { this.dbType = options.dbType }
    if (options.dbHost) { this.dbHost = options.dbHost }
    if (this.dbHost.indexOf(':') > -1) {
      this.dbPort = parseInt(this.dbHost.split(':')[1]);
      this.dbHost = this.dbHost.split(':')[0];
    }
    if (options.dbPort) { this.dbPort = options.dbPort }
    if (options.dbPort) { this.dbPort = options.dbPort }
    if (options.dbName) { this.dbName = options.dbName }
    if (options.dbUser) { this.dbUser = options.dbUser }
    if (options.dbPassword) { this.dbPassword = options.dbPassword }

    // session
    if (options.sessionRequired) { this.sessionRequired = options.sessionRequired }
    if (options.sessionType) { this.sessionType = options.sessionType }
    if (options.sessionHost) { this.sessionHost = options.sessionHost }
    if (this.sessionHost.indexOf(':') > -1) {
      this.sessionPort = parseInt(this.sessionHost.split(':')[1]);
      this.sessionHost = this.sessionHost.split(':')[0];
    }
    if (options.sessionPort) { this.sessionPort = options.sessionPort }
    if (options.sessionCookieDomain) { this.sessionCookieDomain = options.sessionCookieDomain }
    if (options.sessionInitializer) { this.sessionInitializer = options.sessionInitializer }

    // routers
    if (options.statics) { this.statics = options.statics }
    if (options.middlewares) { this.middlewares = options.middlewares }
    if (options.routers) { this.routers = options.routers }
  }
}


// Gets the json schema for polymer.json, generated from the typescript
// interface for runtime validation. See the build script in package.json for
// more info.
const getSchema: () => jsonschema.Schema = (() => {
  let schema: jsonschema.Schema;

  return () => {
    if (schema === undefined) {
      schema = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'schema.json'), 'utf-8'));
    }
    return schema;
  };
})();


const mergeOptions = (a: VcmsOptions, b: VcmsOptions): VcmsOptions => {
  if (b.statics) {
    if (a.statics) {
      a.statics.forEach(s => {
        if (b.statics!.findIndex(s2 => s2.route === s.route) < 0) {
          b.statics!.push(s);
        }
      })
    }
  }
  return { ...a, ...b };
}
