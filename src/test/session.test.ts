import { Session, sessionLogger } from "../session";
import { ProjectConfig } from "../config";
// import * as ChaiAsPromised from 'chai-as-promised';
import { assert } from 'chai';
/* import * as chai from 'chai';

chai.use(ChaiAsPromised); */

suite('Session', () => {
  setup(() => {
    sessionLogger.setDisplay(false);
  });
  teardown(() => {
    //sessionLogger.setDisplay(false);
  })

  test('will try to construct the session', async () => {
    const session: Session = await Session.get(new ProjectConfig({}));
    // @ts-ignore
    assert.equal(session.connection.options.port, 6379);
    // @ts-ignore
    assert.equal(session.connection.options.host, 'localhost');
    session.close();
  });
});
