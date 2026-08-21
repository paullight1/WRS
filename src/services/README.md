# Services

Application service interfaces and orchestration live here. Services consume domain types and expose explicit async results to UI adapters. They do not embed provider credentials or reach directly into React components. Production implementations must fail closed when their configured authority is unavailable.
