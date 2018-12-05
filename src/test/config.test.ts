//const ProjectConfig = require('../config').ProjectConfig;
import { ProjectConfig } from '../config';
import { assert } from 'chai';
import { interceptOutput } from './util';

suite('Project Config', () => {
  suite('ProjectConfig', () => {
    test('set minimums set of defaults when no options are provided', () => {
      const config = new ProjectConfig();
      assert.deepEqual(config, {
        nodeEnv: 'prod',
        port: 8000,
        localHostname: 'localhost',
        http2Required: false,
        http2Key: './server.key',
        http2Cert: './server.crt',
        databaseRequired: false,
        dbHost: 'localhost',
        dbPort: 5432,
        dbType: 'pg',
        sessionRequired: false,
        sessionType: 'redis',
        sessionHost: 'localhost',
        sessionPort: 6379
      });
    });

    test('sets an option overrides the defaults', () => {
      const config = new ProjectConfig({ port: 3001 });
      assert.deepEqual(config, {
        nodeEnv: 'prod',
        port: 3001,
        localHostname: 'localhost',
        http2Required: false,
        http2Key: './server.key',
        http2Cert: './server.crt',
        databaseRequired: false,
        dbHost: 'localhost',
        dbPort: 5432,
        dbType: 'pg',
        sessionRequired: false,
        sessionType: 'redis',
        sessionHost: 'localhost',
        sessionPort: 6379
      });
    });

    test('the constructor computes data', () => {
      const config = new ProjectConfig({
        dbHost: '1.2.3.4:9999',
        sessionHost: '9.8.7.6:1111'
      });
      assert.equal(config.dbHost, '1.2.3.4');
      assert.equal(config.dbPort, 9999);
      assert.equal(config.sessionHost, '9.8.7.6');
      assert.equal(config.sessionPort, 1111);
    });

    suite('getConfig', () => {
      test('test config file precedence', async () => {
        const config: ProjectConfig = await ProjectConfig.get([], 'test', 'test');
        assert.equal(config.port, 3003);
      });

      test('test command line precedence', async () => {
        const config: ProjectConfig = await ProjectConfig.get(['--port', '1234'], 'test', 'test');
        assert.equal(config.port, 1234);
      });

      test('test command line precedence', async () => {
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        const config: ProjectConfig = await ProjectConfig.get(['--port', '1234'], 'test', 'test');
        assert.equal(config.port, 10);
        /* restore NODE_ENV */
        process.env.NODE_ENV = originalNodeEnv;
        if (process.env.NODE_ENV === 'undefined') { delete process.env.NODE_ENV }
      });
    });
  });

  suite('Arguments', () => {
    test('pass arguments to getConfig', async () => {
      const config = await ProjectConfig.loadCommandLineOptions(['--port', '3005']);
      assert.deepEqual(config, {
        port: 3005
      });
    });

    test('passing unknown argument fails', async () => {
      const output = await interceptOutput(async () => {
        ProjectConfig.loadCommandLineOptions(['--this-is-fake']);
      });
      assert.include(output, 'invalid');
    });

    test('arguments are converted to camelCase', async () => {
      const config = await ProjectConfig.loadCommandLineOptions(['--local-hostname=localhost', '--database']);
      assert.deepEqual(config, {
        localHostname: 'localhost',
        databaseRequired: true
      });
    });
  });

  suite('Config File', () => {
    test('load default options from the file', () => {
      const config = ProjectConfig.loadOptionsFromFile('./test');
      assert.deepEqual(config, {
        databaseRequired: true,
        port: 3003
      });
    });

    test('static add proper route to the config', () => {
      const config = ProjectConfig.loadOptionsFromFile('./test', 'dev');
      assert.deepEqual(config.statics, [{ route: undefined, serve: 'publics' }]);
    });

    test('load dev options from file (using argument)', () => {
      const config = ProjectConfig.loadOptionsFromFile('./test', 'dev');
      assert.equal(config.port, 3001);
    });

    test('load test options from file', () => {
      const config = ProjectConfig.loadOptionsFromFile('./test', 'test');
      assert.equal(config.port, 4000);
    });

    test('convert dash to camel case', () => {
      const config = ProjectConfig.loadOptionsFromFile('./test/.vcms-dash.yml');
      assert.deepEqual(config, {
        databaseRequired: false
      });
    });
  });

  suite('Script File', () => {
    test('the media argument is passed to the script', async () => {
      const options = await ProjectConfig.loadOptionsFromScript('test/', { localHostname: 'hello' });
      assert.equal(options.localHostname, 'hello:added-from-call');
    });

    test('the load function will try to find a candidate', async () => {
      const options = await ProjectConfig.loadOptionsFromScript('test/', { nodeEnv: 'test' }); // 'test' as the base
      assert.equal(options.port, 10);
    });
  });
});
