class DeclareConstraint {
    /*
       A constraint in the form:
           AST_node ∈ name, e.g

           function sum(a,b) { c = a + b; return c; }          would become
           <func_decl> ∈ {"sum"}
     */
}

class AssignConstraint {
    /*
       A constraint in the form:
           rhs ⊆ lhs, e.g

           let plus = sum;          would become
           {"sum"} ⊆ {"plus"}
     */
}

class CallConstraint {
    /*
       A constraint in the form:
           resolved_func ∈ called_func => {called_arg ⊆ func_param} and func_ret ⊆ func_call, e.g

           let answer = sum(x,y);      would become
           <sum_decl> ∈ {"sum"} => {"x"} ⊆ {"a"} and {"y"} ⊆ {"b"} and {"c"} ⊆ {"sum(a,b)"}
     */
}

