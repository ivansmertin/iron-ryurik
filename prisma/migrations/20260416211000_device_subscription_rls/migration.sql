ALTER TABLE public."DeviceSubscription" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS device_subscription_select_own ON public."DeviceSubscription";
DROP POLICY IF EXISTS device_subscription_insert_own ON public."DeviceSubscription";
DROP POLICY IF EXISTS device_subscription_update_own ON public."DeviceSubscription";
DROP POLICY IF EXISTS device_subscription_delete_own ON public."DeviceSubscription";

CREATE POLICY device_subscription_select_own
  ON public."DeviceSubscription"
  FOR SELECT
  TO authenticated
  USING ("userId" = (SELECT auth.uid()));

CREATE POLICY device_subscription_insert_own
  ON public."DeviceSubscription"
  FOR INSERT
  TO authenticated
  WITH CHECK ("userId" = (SELECT auth.uid()));

CREATE POLICY device_subscription_update_own
  ON public."DeviceSubscription"
  FOR UPDATE
  TO authenticated
  USING ("userId" = (SELECT auth.uid()))
  WITH CHECK ("userId" = (SELECT auth.uid()));

CREATE POLICY device_subscription_delete_own
  ON public."DeviceSubscription"
  FOR DELETE
  TO authenticated
  USING ("userId" = (SELECT auth.uid()));

REVOKE ALL ON TABLE public."DeviceSubscription" FROM anon;
REVOKE ALL ON TABLE public."DeviceSubscription" FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."DeviceSubscription" TO authenticated;
