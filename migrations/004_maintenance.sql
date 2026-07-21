-- Migration 004: Maintenance
-- Depends on: 001_core_identity.sql
--
-- The old implementation pruned expired sessions inline on every call to
-- createSession() (session.filter(...) + full file rewrite). Doing cleanup
-- work synchronously inside the hot login path is itself a scalability
-- problem, and it doesn't clean up expired password-reset or
-- email-verification tokens at all.
--
-- Fix: expired sessions are simply excluded by the app's session-lookup
-- query (`WHERE expires_at > NOW()`, see repository layer) so correctness
-- never depends on cleanup having run. This function is for *storage*
-- hygiene only — run it on a schedule (cron / pg_cron / hosting provider's
-- scheduled job), never inline in a request path.

CREATE OR REPLACE FUNCTION cleanup_expired_auth_records()
RETURNS TABLE(sessions_deleted BIGINT, reset_tokens_deleted BIGINT, verification_tokens_deleted BIGINT) AS $$
DECLARE
  s_count BIGINT;
  r_count BIGINT;
  v_count BIGINT;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS s_count = ROW_COUNT;

  DELETE FROM password_reset_tokens WHERE expires_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS r_count = ROW_COUNT;

  DELETE FROM email_verification_tokens WHERE expires_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT s_count, r_count, v_count;
END;
$$ LANGUAGE plpgsql;

-- Note: rows are kept for 7 days past expiry (not deleted immediately) so
-- "your session expired" support investigations and the audit trail have
-- something to look at. Adjust retention to your compliance requirements.
