-- Вспомогательная функция: роль текущего пользователя
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS "UserRole"
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public."User" WHERE id = auth.uid() AND "deletedAt" IS NULL;
$$;

-- ============ ENABLE RLS ============

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TrainerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MembershipPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WorkoutTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WorkoutTemplateItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Program" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WorkoutLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ExerciseLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Measurement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DeviceIntegration" ENABLE ROW LEVEL SECURITY;

-- ============ User ============

CREATE POLICY user_select ON public."User"
  FOR SELECT USING (
    id = auth.uid()
    OR public.current_user_role() IN ('admin', 'trainer')
  );

CREATE POLICY user_update ON public."User"
  FOR UPDATE USING (
    id = auth.uid()
    OR public.current_user_role() = 'admin'
  );

-- ============ TrainerProfile ============

CREATE POLICY trainer_profile_select ON public."TrainerProfile"
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY trainer_profile_update ON public."TrainerProfile"
  FOR UPDATE USING (
    "userId" = auth.uid()
    OR public.current_user_role() = 'admin'
  );

-- ============ Session ============

CREATE POLICY session_select ON public."Session"
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY session_insert ON public."Session"
  FOR INSERT WITH CHECK (
    public.current_user_role() IN ('admin', 'trainer')
  );

CREATE POLICY session_update ON public."Session"
  FOR UPDATE USING (
    public.current_user_role() = 'admin'
    OR ("trainerId" = auth.uid() AND public.current_user_role() = 'trainer')
  );

CREATE POLICY session_delete ON public."Session"
  FOR DELETE USING (
    public.current_user_role() = 'admin'
    OR ("trainerId" = auth.uid() AND public.current_user_role() = 'trainer')
  );

-- ============ Booking ============

CREATE POLICY booking_select ON public."Booking"
  FOR SELECT USING (
    "userId" = auth.uid()
    OR public.current_user_role() IN ('admin', 'trainer')
  );

CREATE POLICY booking_insert ON public."Booking"
  FOR INSERT WITH CHECK (
    "userId" = auth.uid()
  );

CREATE POLICY booking_update ON public."Booking"
  FOR UPDATE USING (
    "userId" = auth.uid()
    OR public.current_user_role() = 'admin'
  );

-- ============ MembershipPlan ============

CREATE POLICY membership_plan_select ON public."MembershipPlan"
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY membership_plan_modify ON public."MembershipPlan"
  FOR ALL USING (
    public.current_user_role() = 'admin'
  );

-- ============ Membership ============

CREATE POLICY membership_select ON public."Membership"
  FOR SELECT USING (
    "userId" = auth.uid()
    OR public.current_user_role() IN ('admin', 'trainer')
  );

CREATE POLICY membership_modify ON public."Membership"
  FOR ALL USING (
    public.current_user_role() = 'admin'
  );

-- ============ Exercise ============

CREATE POLICY exercise_select ON public."Exercise"
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY exercise_modify ON public."Exercise"
  FOR ALL USING (
    public.current_user_role() IN ('admin', 'trainer')
  );

-- ============ WorkoutTemplate ============

CREATE POLICY workout_template_select ON public."WorkoutTemplate"
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY workout_template_modify ON public."WorkoutTemplate"
  FOR ALL USING (
    public.current_user_role() IN ('admin', 'trainer')
  );

-- ============ WorkoutTemplateItem ============

CREATE POLICY workout_template_item_select ON public."WorkoutTemplateItem"
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY workout_template_item_modify ON public."WorkoutTemplateItem"
  FOR ALL USING (
    public.current_user_role() IN ('admin', 'trainer')
  );

-- ============ Program ============

CREATE POLICY program_select ON public."Program"
  FOR SELECT USING (
    "clientId" = auth.uid()
    OR "trainerId" = auth.uid()
    OR public.current_user_role() = 'admin'
  );

CREATE POLICY program_modify ON public."Program"
  FOR ALL USING (
    public.current_user_role() IN ('admin', 'trainer')
  );

-- ============ WorkoutLog ============

CREATE POLICY workout_log_all ON public."WorkoutLog"
  FOR ALL USING (
    "userId" = auth.uid()
    OR public.current_user_role() = 'admin'
    OR (
      public.current_user_role() = 'trainer'
      AND "userId" IN (
        SELECT "clientId" FROM public."Program" WHERE "trainerId" = auth.uid()
      )
    )
  );

-- ============ ExerciseLog ============

CREATE POLICY exercise_log_all ON public."ExerciseLog"
  FOR ALL USING (
    "workoutLogId" IN (
      SELECT id FROM public."WorkoutLog"
      WHERE "userId" = auth.uid()
        OR public.current_user_role() = 'admin'
        OR (
          public.current_user_role() = 'trainer'
          AND "userId" IN (
            SELECT "clientId" FROM public."Program" WHERE "trainerId" = auth.uid()
          )
        )
    )
  );

-- ============ Measurement ============

CREATE POLICY measurement_all ON public."Measurement"
  FOR ALL USING (
    "userId" = auth.uid()
    OR public.current_user_role() = 'admin'
    OR (
      public.current_user_role() = 'trainer'
      AND "userId" IN (
        SELECT "clientId" FROM public."Program" WHERE "trainerId" = auth.uid()
      )
    )
  );

-- ============ DeviceIntegration ============

CREATE POLICY device_integration_all ON public."DeviceIntegration"
  FOR ALL USING (
    "userId" = auth.uid()
  );
