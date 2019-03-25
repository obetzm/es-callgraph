var aws =  require("aws-sdk")
let SES = new aws.SES()

module.exports = {
    onwrite: function (params) {
        console.log("do stuff" + params);
        SES.sendEmail();
    }
}