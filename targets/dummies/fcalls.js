
var a;
a = myvar.myfield;

var importedFunc = require("./third")
var aws =  require("aws-sdk")
var dynamo = new aws.DynamoDB.DocumentClient();


function updateMethod() {
    dynamo.update({ TableName: "someTable"}, callback);
}

var subMethod = function () {
    function innerFunc() { updateMethod() }
    innerFunc()
};


function deadEndMethod() {
    importedFunc()
}

function mainMethod(a) {
    for(i=0;i<2;i++) {
    subMethod();
    deadEndMethod();
    }
}


module.exports = {
    main: mainMethod
}