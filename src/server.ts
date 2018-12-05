import { Logger } from "./logging";
import { ProjectConfig } from "./config";

import * as express from 'express';
import * as compression from 'compression';
import * as path from 'path';
import { Session } from "./session";

import * as http from 'spdy';
import { getTLSCertificate } from "./util/tls";

const logger: Logger = new Logger('server');
export { logger as serverLogger };


/* export interface Request extends express.Request {
  auth: AuthorizationDetails
}; */


export class Server {

  static createApp(config: ProjectConfig, session?: Session): express.Application {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(compression());

    if (session) {
      if (session.middleware) {
        app.use(session.middleware);
      }

      if (session.sessionInitializer) {
        app.use((req, _res, next) => {
          if (session.sessionInitializer) {
            session.sessionInitializer(<Express.Session>req.session);
            next();
          }
        });
      }
    }

    app.use(require('morgan')('dev'));

    app.get('/ping', async (_req, res) => res.send('pong\n'));

    /* middlewares */
    if (config.middlewares) {
      for (const mw of config.middlewares) {
        logger.info(`Registering middleware "${mw}"`);
        app.use(mw);
      }
    }


    /* statics */
    if (config.statics) {
      for (const s of config.statics) {
        if (s.route) {
          logger.info(`Registering static directory : "${s.route}" => "${s.serve}"`);
          app.use(s.route, staticMiddleware(s.serve));
        }
        else {
          logger.info(`Registering static directory : "${s.serve}"`);
          app.use(staticMiddleware(s.serve));
        }
      }
    }
    else {
      // register public by default
      logger.info(`Registering default static directory : "public/"`);
      app.use(staticMiddleware('public'));
    }


    /* routers */
    if (config.routers) {
      for (const base in config.routers) {
        logger.info(`Providing route "${base}"`);
        app.use(base, config.routers[base]);
      }
    }

    return app;
  }

  static async createServer(app: express.Application, config: ProjectConfig): Promise<http.Server> {
    const opt: any = {
      spdy: {
        protocols: [config.http2Required ? 'h2' : 'http/1.1']
      }
    }

    if (config.http2Required) {
      const keys = await getTLSCertificate(config.http2Key, config.http2Cert);
      opt.key = keys.key;
      opt.cert = keys.cert;
    }
    else {
      opt.spdy.plain = true;
      opt.spdy.ssl = true;
    }

    return http.createServer(opt, app);
  }

  static async get(config: ProjectConfig, app: express.Application) {
    const server = await this.createServer(app, config);
    return new Promise<http.Server | null>((resolve, reject) => {
      server.listen(config.port, config.localHostname, () => {
        logger.success(`listening http${config.http2Required ? 's' : ''}://${config.localHostname}:${config.port}`);

        resolve(server);
      });

      server.on('error', (err) => {
        reject(err);
      });
    });
  }
}


const staticMiddleware = (serve: string) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // the index.html can be overriden
  if (req.path === '/') {
    next();
    return;
  }
  express.static(path.resolve(serve))(req, res, next);
}
