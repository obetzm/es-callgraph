
function inc(i) { return i+1; }
function dec(j) { return j-1; }
function ide(k) { return k; }

function foo(n,f) {
    if (n===0) f=ide;
    r = f(n);
    return r;
}

function main() {
    x = process.argv[0];
    if (x>0) y = foo(x,inc);
    else y = foo(x,dec);
    return y;
}