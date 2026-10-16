-- Removes the QA test data from production (requested by Tarun, 16 Oct 2026).
-- Keeps the only real account (tarun@miyoglobal.com). One transaction: any
-- unexpected FK error rolls everything back.
BEGIN;

CREATE TEMP TABLE qa_users ON COMMIT DROP AS
  SELECT id FROM users
  WHERE email <> 'tarun@miyoglobal.com'
    AND (first_name ILIKE 'qa%' OR name ILIKE 'qa%' OR email ILIKE 'qa%');

-- "QA Test" records
DELETE FROM tickets WHERE title ILIKE 'qa%';                       -- watchers cascade
DELETE FROM project_statuses WHERE project_id IN (SELECT id FROM projects WHERE name ILIKE 'qa%');
DELETE FROM projects WHERE name ILIKE 'qa%';
DELETE FROM candidates WHERE first_name ILIKE 'qa%';               -- sla tracking cascades
DELETE FROM job_postings WHERE title ILIKE 'qa%';
DELETE FROM job_roles WHERE title ILIKE 'qa%';
DELETE FROM holidays WHERE name ILIKE 'qa%';
DELETE FROM assets WHERE name ILIKE 'qa%';
DELETE FROM expenses WHERE description ILIKE 'qa%';

-- QA employees and everything they own
DELETE FROM appraisals WHERE user_id IN (SELECT id FROM qa_users)
  OR cycle_id IN (SELECT id FROM appraisal_cycles WHERE user_id IN (SELECT id FROM qa_users));  -- stages cascade
UPDATE appraisal_stages SET assignee_id = NULL WHERE assignee_id IN (SELECT id FROM qa_users);
DELETE FROM appraisal_cycles WHERE user_id IN (SELECT id FROM qa_users);
DELETE FROM attendance WHERE user_id IN (SELECT id FROM qa_users);
DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM qa_users);
DELETE FROM department_members WHERE user_id IN (SELECT id FROM qa_users);
DELETE FROM employee_skills WHERE user_id IN (SELECT id FROM qa_users);
DELETE FROM leave_balances WHERE user_id IN (SELECT id FROM qa_users);
DELETE FROM leave_requests WHERE user_id IN (SELECT id FROM qa_users);
UPDATE leave_requests SET approver_id = NULL WHERE approver_id IN (SELECT id FROM qa_users);
DELETE FROM notifications WHERE user_id IN (SELECT id FROM qa_users);
DELETE FROM organization_members WHERE user_id IN (SELECT id FROM qa_users);
DELETE FROM payrolls WHERE user_id IN (SELECT id FROM qa_users);
DELETE FROM salary_structures WHERE user_id IN (SELECT id FROM qa_users);
DELETE FROM users WHERE id IN (SELECT id FROM qa_users);           -- user_sessions cascade

COMMIT;
