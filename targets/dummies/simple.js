

var library =  require("libname")

function mainMethod(a) {
    var innerVariable = 4;
    innerVariable = a;
    library.method(innerVariable);
}


module.exports = {
    main: mainMethod
}