
var a;
a = myvar.myfield;

var aws =  require("aws-sdk")
var dynamo = aws.DynamoDB.DocumentClient();

function subMethod() {
    updateMethod();
}

function updateMethod() {

    dynamo.update({ TableName: "some_table"}, callback);
}

function deadEndMethod() {
    //no further function calls here
}

function mainMethod(a) {
    subMethod();
    deadEndMethod();
}


module.exports = {
    main: mainMethod
}