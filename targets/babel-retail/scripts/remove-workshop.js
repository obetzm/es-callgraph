'use strict';

var AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies


var inquirer = require('inquirer'); // eslint-disable-line import/no-extraneous-dependencies


var CANCEL = 'CANCEL';
var ALL_STACKS = '*** DELETE ALL STACKS ***';
var stackNameRegEx = /^(ingress-stream-|winner-view-|winner-api-)[a-zA-Z0-9]{4}$/;
var cloudFormation = new AWS.CloudFormation();
var impl = {
  queryStacks: function queryStacks(nextToken, allStacks) {
    var params = {
      StackStatusFilter: ['CREATE_COMPLETE', 'UPDATE_COMPLETE'],
      NextToken: nextToken
    };
    if (!allStacks) allStacks = []; // eslint-disable-line no-param-reassign

    return cloudFormation.listStacks(params).promise().then(function (stacks) {
      allStacks = allStacks.concat(stacks.StackSummaries); // eslint-disable-line no-param-reassign

      if (stacks.NextToken) {
        return queryStacks(stacks.NextToken, allStacks);
      } else {
        return allStacks;
      }
    });
  },
  removeStacks: function removeStacks(stackList, currentStack) {
    if (!currentStack) currentStack = 0; // eslint-disable-line no-param-reassign

    var params = {
      StackName: stackList[currentStack]
    };
    var message = "Deleting stack: ".concat(params.StackName, "...");

    if (stackList.length > 1) {
      message += " (".concat(currentStack + 1, " of ").concat(stackList.length, ")");
    }

    console.log(message);
    return cloudFormation.deleteStack(params).promise().then(function () {
      console.log("".concat(params.StackName, " deleted."));
      currentStack += 1; // eslint-disable-line no-param-reassign

      if (currentStack < stackList.length) {
        return impl.removeStacks(stackList, currentStack);
      } else {
        return Promise.resolve('Done.');
      }
    });
  },
  deleteAllStacks: function deleteAllStacks(allStacks) {
    return inquirer.prompt([{
      message: 'Are you sure? (yes/NO) ',
      choices: ['yes', 'NO'],
      default: 'NO',
      name: 'confirm'
    }]).then(function (answers) {
      if (answers.confirm === 'yes') {
        return impl.removeStacks(allStacks);
      } else {
        return Promise.resolve('Cancelled.');
      }
    });
  },
  main: function main() {
    impl.queryStacks().then(function (stacks) {
      var filtered = stacks.filter(function (stack) {
        return stackNameRegEx.test(stack.StackName);
      });
      var stackNames = filtered.map(function (s) {
        return s.StackName;
      });

      if (stackNames.length === 0) {
        return Promise.resolve("No stacks found matching ".concat(stackNameRegEx, " Exiting."));
      }

      console.log("Found ".concat(stackNames.length, " stacks."));
      return inquirer.prompt([{
        type: 'list',
        name: 'stackSelection',
        message: 'Choose which stacks to delete:',
        choices: [ALL_STACKS].concat(stackNames).concat([CANCEL])
      }]).then(function (answers) {
        switch (answers.stackSelection) {
          case CANCEL:
            return Promise.resolve('Cancelled.');

          case ALL_STACKS:
            return impl.deleteAllStacks(stackNames);

          default:
            return impl.removeStacks([answers.stackSelection]);
        }
      });
    }).then(function (message) {
      console.log(message);
    }).catch(function (error) {
      console.error("ERROR: ".concat(error));
      process.exit(1);
    });
  }
};
impl.main();