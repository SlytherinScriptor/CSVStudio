export function generateSampleData(): File {
    const headers = ['id', 'first_name', 'last_name', 'email', 'department', 'join_date', 'salary', 'performance_score'];
    const rows = [
        ['1', 'John', 'Doe', 'john.doe@example.com', 'Engineering', '2023-01-15', '120000', '4.5'],
        ['2', 'Jane', 'Smith', 'jane.smith@example.com', 'Marketing', '2023-02-20', '95000', '4.8'],
        ['3', 'Bob', 'Johnson', 'bob.j@example.com', 'Sales', '2022-11-01', '85000', '3.9'],
        ['4', 'Alice', 'Williams', 'alice.w@example.com', 'Engineering', '2023-03-10', '115000', '4.2'],
        ['5', 'Charlie', 'Brown', 'charlie.b@example.com', 'HR', '2021-08-15', '75000', '4.0'],
        ['6', 'Eva', 'Davis', 'eva.d@example.com', 'Marketing', '2023-01-05', '92000', '4.6'],
        ['7', 'Frank', 'Miller', 'frank.m@example.com', 'Sales', '2022-09-23', '88000', '3.5'],
        ['8', 'Grace', 'Wilson', 'grace.w@example.com', 'Engineering', '2023-04-12', '125000', '4.7'],
        ['9', 'Henry', 'Moore', 'henry.m@example.com', 'Finance', '2022-12-01', '105000', '4.1'],
        ['10', 'Ivy', 'Taylor', 'ivy.t@example.com', 'HR', '2023-05-20', '78000', '4.3'],
        ['11', 'Jack', 'Anderson', 'jack.a@example.com', 'Sales', '2022-10-15', '82000', '3.8'],
        ['12', 'Kelly', 'Thomas', 'kelly.t@example.com', 'Finance', '2023-02-01', '102000', '4.4'],
    ];

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    return new File([csvContent], 'employee_sample_data.csv', { type: 'text/csv' });
}
