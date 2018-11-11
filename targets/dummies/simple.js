

var aws =  require("aws")
var dynamo = aws.DynamoDB.DocumentClient();

function subMethod() {

}

function mainMethod(a) {
    subMethod();
}


module.exports = {
    main: mainMethod
}