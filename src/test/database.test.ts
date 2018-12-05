import { Database } from "../database";
import { ProjectConfig } from "../config";

import { databaseLogger } from '../database';
import * as chai from 'chai';
import { assert } from 'chai';
import { interceptOutput } from "./util";
// import * as chaiAsPromised from 'chai-as-promised'


suite('Database', () => {
  setup(() => {
    databaseLogger.setDisplay(false);
  });

  test('Database needs identification', () => {
    chai.expect(() => new Database(new ProjectConfig())).to.throw('Database ident incorrect !');
  });

  test('options are passed through ProjectConfig', async () => {
    const database = new Database(new ProjectConfig({
      dbName: 'vcms_test',
      dbUser: 'vcms_user',
      dbPassword: 'password'
    }));
    assert.equal(database.connection.client.config.connection.port, 5432); // default port
    assert.equal(database.connection.client.config.connection.database, 'vcms_test');
  });

  test('connection to test database successful', async () => {
    databaseLogger.setDisplay(true);
    const output = await interceptOutput(async () => {
      const database = new Database(new ProjectConfig({
        dbName: 'vcms_test',
        dbUser: 'vcms_user',
        dbPassword: 'password'
      }));
      await database.checkConnection(); // trigger the creation of one connection from the pool
      await database.closeConnection();

      // databaseLogger.setDisplay(false);
    });
    assert.include(output, '#1 has been created');
  });
});
