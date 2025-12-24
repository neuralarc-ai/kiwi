-- Check if employees exist
SELECT COUNT(*) as employee_count FROM employees;

-- Insert dummy employees if they don't exist
INSERT INTO employees (employee_id, first_name, last_name, email, phone, department, position, hire_date, salary, address)
SELECT * FROM (VALUES
  ('EMP001', 'John', 'Doe', 'john.doe@company.com', '+1234567890', 'Engineering', 'Software Engineer', '2023-01-15', 75000, '123 Main St, City, State'),
  ('EMP002', 'Jane', 'Smith', 'jane.smith@company.com', '+1234567891', 'Marketing', 'Marketing Manager', '2023-02-20', 65000, '456 Oak Ave, City, State'),
  ('EMP003', 'Mike', 'Johnson', 'mike.johnson@company.com', '+1234567892', 'Sales', 'Sales Representative', '2023-03-10', 55000, '789 Pine Rd, City, State'),
  ('EMP004', 'Sarah', 'Williams', 'sarah.williams@company.com', '+1234567893', 'HR', 'HR Executive', '2023-04-05', 60000, '321 Elm St, City, State'),
  ('EMP005', 'David', 'Brown', 'david.brown@company.com', '+1234567894', 'Finance', 'Financial Analyst', '2023-05-12', 70000, '654 Maple Dr, City, State')
) AS v(employee_id, first_name, last_name, email, phone, department, position, hire_date, salary, address)
WHERE NOT EXISTS (
  SELECT 1 FROM employees e WHERE e.employee_id = v.employee_id OR e.email = v.email
);

-- Verify employees were created
SELECT id, employee_id, first_name, last_name, email, department, salary FROM employees ORDER BY id;
