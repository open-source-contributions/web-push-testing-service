#! /usr/bin/env node

/**
 * Copyright 2016 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
**/
'use strict';

const minimist = require('minimist');
const storage = require('node-persist');
const execSync = require('child_process').execSync;
const WPTS = require('./index.js');
const logHelper = require('./helper/log-helper.js');

const printHelpText = () => {
  /* eslint-disable max-len */
  console.log('web-push-testing-service');
  console.log('');
  console.log('Usage:');
  console.log('    web-push-testing-service [command] [options]');
  console.log('');
  console.log('Command:');
  console.log('    download-browsers');
  console.log('    start <service-id>');
  console.log('    stop <service-id>');
  console.log('');
  console.log('Options:');
  console.log('    -h --help                     Show this screen.');
  console.log('    -p --port <Port Number>       Change port the service is run on.');
  console.log('');
  /* eslint-enable line-length */
};

const stopService = serviceId => {
  const servicePID = storage.getItemSync(serviceId);
  if (servicePID !== null) {
    try {
      execSync(`kill -9 ${servicePID} > /dev/null 2>&1`);
    } catch (err) {
      // NOOP
    }
  }
  storage.removeItemSync(serviceId);
};

const serviceValues = {};

const cliArgs = minimist(process.argv.slice(2));

const cliArgKeys = Object.keys(cliArgs);
cliArgKeys.forEach(argKey => {
  switch (argKey) {
    case '_':
      // Ignore this as it's not user input
      break;
    case 'h':
    case 'help':
      printHelpText();
      process.exit(0);
      break;
    case 'p':
    case 'port':
      if (typeof cliArgs[argKey] === 'number') {
        serviceValues.port = cliArgs[argKey];
      } else {
        logHelper.error(`Invalid valud for '${argKey}' argument. It must ` +
          `be a number, instead received: '${cliArgs[argKey]}'`);
        process.exit(1);
      }
      break;
    default:
      logHelper.info(`Ignoring input '${argKey}'`);
      break;
  }
});

if (cliArgs._.length === 0) {
  printHelpText();
  process.exit(1);
}

const webPushTestingService = new WPTS(serviceValues.port);

switch (cliArgs._[0]) {
  case 'download-browsers':
    logHelper.info('Starting browser download....');
    webPushTestingService.downloadBrowsers();
    break;
  case 'start': {
    if (cliArgs._.length === 2) {
      const serviceId = cliArgs._[1];
      storage.initSync();

      stopService(serviceId);

      storage.setItemSync(serviceId, process.pid);
      logHelper.info('Starting service....');
      webPushTestingService.startService()
      .then(url => {
        const LINE = '---------------------------------' +
          '------------------------';
        logHelper.info(``);
        logHelper.info(LINE);
        logHelper.info(``);
        logHelper.info(`    Starting Service at ` +
            `${url}`);
        logHelper.info(``);
        logHelper.info(LINE);
        logHelper.info(``);
      });
    } else {
      console.log('You must include an ID so this service can be stopped at ' +
        'later on with \'stop-service\'');
      process.exit(1);
    }
    break;
  }
  case 'stop': {
    if (cliArgs._.length === 2) {
      const serviceId = cliArgs._[1];
      storage.initSync();
      const servicePID = storage.getItemSync(serviceId);
      if (!servicePID) {
        logHelper.error(`Unable to find a service with ID '${serviceId}'`);
        process.exit(0);
        break;
      }

      logHelper.info('Stopping service....');
      stopService(serviceId);
    } else {
      console.log('You must include an ID so this service can be stopped at ' +
        'later on with \'stop-service\'');
      process.exit(1);
    }
    break;
  }
  default:
    printHelpText();
    process.exit(1);
    break;
}
