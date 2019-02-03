var aws =  require("aws-sdk")
let SES = new aws.SES()

module.exports = {
    onwrite: function(params) {
        SES.sendEmail();
    }
}