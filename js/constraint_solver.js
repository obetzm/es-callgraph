

function solver(state) {
    let something_changed = true;

    while (something_changed) {
        something_changed = false;
        state.constraints.assignments.forEach((constraint) => {
            constraint.execute_constraint();
        });
        state.constraints.calls.forEach((constraint) => {
            constraint.execute_constraint();
        });
    }

}

module.exports = solver;