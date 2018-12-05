import { Vcms } from "../vcms";
import { loggers } from "../logging";
import { assert } from 'chai';



suite('Vcms', () => {
  test('successful connection', async () => {
    loggers.forEach(l => l.setDisplay(true)); // display all loggers

    const vcms = new Vcms([], {
      root: 'test',
      optionsFilepath: '.vcms-vcms.yml'
    });
    await vcms.run();

    /* tests */
    assert.isNotNull(vcms.database);
    assert.equal(vcms.database.connection.client.config.connection.database, 'vcms_test');
    assert.isNotNull(vcms.session);

    await vcms.destroy();
  });
});
