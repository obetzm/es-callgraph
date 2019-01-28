
var a;
a = myvar.myfield;

var aws =  require("aws-sdk")
var dynamo = new aws.DynamoDB.DocumentClient();


var subMethod = function () { updateMethod() };

function updateMethod() {
    dynamo.update({ TableName: "someTable"}, callback);
}

function deadEndMethod() {
    //no further function calls here
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