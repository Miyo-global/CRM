-- Make holiday_work_requests.reason nullable (field is optional in the form)
ALTER TABLE holiday_work_requests ALTER COLUMN reason DROP NOT NULL;
