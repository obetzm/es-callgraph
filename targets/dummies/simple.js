

var aws =  require("aws")
var dynamo = aws.DynamoDB.DocumentClient();

function subMethod() {
    //dynamo.update("someTable", {});
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