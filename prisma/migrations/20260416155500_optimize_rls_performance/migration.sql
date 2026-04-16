-- Обновление функции current_user_role для использования InitPlan (select auth.uid())
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS "UserRole"
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public."User" WHERE id = (SELECT auth.uid()) AND "deletedAt" IS NULL;
$$;

-- Удаление старых политик
DROP POLICY IF EXISTS membership_plan_select ON public."MembershipPlan";
DROP POLICY IF EXISTS membership_plan_modify ON public."MembershipPlan";

DROP POLICY IF EXISTS membership_select ON public."Membership";
DROP POLICY IF EXISTS membership_modify ON public."Membership";

DROP POLICY IF EXISTS exercise_select ON public."Exercise";
DROP POLICY IF EXISTS exercise_modify ON public."Exercise";

DROP POLICY IF EXISTS workout_template_select ON public."WorkoutTemplate";
DROP POLICY IF EXISTS workout_template_modify ON public."WorkoutTemplate";

DROP POLICY IF EXISTS workout_template_item_select ON public."WorkoutTemplateItem";
DROP POLICY IF EXISTS workout_template_item_modify ON public."WorkoutTemplateItem";

DROP POLICY IF EXISTS program_select ON public."Program";
DROP POLICY IF EXISTS program_modify ON public."Program";

DROP POLICY IF EXISTS user_select ON public."User";
DROP POLICY IF EXISTS user_update ON public."User";

DROP POLICY IF EXISTS trainer_profile_select ON public."TrainerProfile";
DROP POLICY IF EXISTS trainer_profile_update ON public."TrainerProfile";

DROP POLICY IF EXISTS session_select ON public."Session";
DROP POLICY IF EXISTS session_insert ON public."Session";
DROP POLICY IF EXISTS session_update ON public."Session";
DROP POLICY IF EXISTS session_delete ON public."Session";

DROP POLICY IF EXISTS booking_select ON public."Booking";
DROP POLICY IF EXISTS booking_insert ON public."Booking";
DROP POLICY IF EXISTS booking_update ON public."Booking";

DROP POLICY IF EXISTS workout_log_all ON public."WorkoutLog";
DROP POLICY IF EXISTS exercise_log_all ON public."ExerciseLog";
DROP POLICY IF EXISTS measurement_all ON public."Measurement";
DROP POLICY IF EXISTS device_integration_all ON public."DeviceIntegration";

-- ============ ПЕРЕСОЗДАНИЕ ПОЛИТИК С ИСПОЛЬЗОВАНИЕМ InitPlan и разделением FOR ALL ============

-- ============ User ============
CREATE POLICY user_select ON public."User"
  FOR SELECT USING (
    id = (select auth.uid())
    OR (select public.current_user_role()) IN ('admin', 'trainer')
  );

CREATE POLICY user_update ON public."User"
  FOR UPDATE USING (
    id = (select auth.uid())
    OR (select public.current_user_role()) = 'admin'
  );

-- ============ TrainerProfile ============
CREATE POLICY trainer_profile_select ON public."TrainerProfile"
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY trainer_profile_update ON public."TrainerProfile"
  FOR UPDATE USING (
    "userId" = (select auth.uid())
    OR (select public.current_user_role()) = 'admin'
  );

-- ============ Session ============
CREATE POLICY session_select ON public."Session"
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY session_insert ON public."Session"
  FOR INSERT WITH CHECK (
    (select public.current_user_role()) IN ('admin', 'trainer')
  );

CREATE POLICY session_update ON public."Session"
  FOR UPDATE USING (
    (select public.current_user_role()) = 'admin'
    OR ("trainerId" = (select auth.uid()) AND (select public.current_user_role()) = 'trainer')
  );

CREATE POLICY session_delete ON public."Session"
  FOR DELETE USING (
    (select public.current_user_role()) = 'admin'
    OR ("trainerId" = (select auth.uid()) AND (select public.current_user_role()) = 'trainer')
  );

-- ============ Booking ============
CREATE POLICY booking_select ON public."Booking"
  FOR SELECT USING (
    "userId" = (select auth.uid())
    OR (select public.current_user_role()) IN ('admin', 'trainer')
  );

CREATE POLICY booking_insert ON public."Booking"
  FOR INSERT WITH CHECK (
    "userId" = (select auth.uid())
  );

CREATE POLICY booking_update ON public."Booking"
  FOR UPDATE USING (
    "userId" = (select auth.uid())
    OR (select public.current_user_role()) = 'admin'
  );

-- ============ MembershipPlan ============
CREATE POLICY membership_plan_select ON public."MembershipPlan"
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY membership_plan_insert ON public."MembershipPlan"
  FOR INSERT WITH CHECK ((select public.current_user_role()) = 'admin');

CREATE POLICY membership_plan_update ON public."MembershipPlan"
  FOR UPDATE USING ((select public.current_user_role()) = 'admin');

CREATE POLICY membership_plan_delete ON public."MembershipPlan"
  FOR DELETE USING ((select public.current_user_role()) = 'admin');

-- ============ Membership ============
CREATE POLICY membership_select ON public."Membership"
  FOR SELECT USING (
    "userId" = (select auth.uid())
    OR (select public.current_user_role()) IN ('admin', 'trainer')
  );

CREATE POLICY membership_insert ON public."Membership"
  FOR INSERT WITH CHECK ((select public.current_user_role()) = 'admin');

CREATE POLICY membership_update ON public."Membership"
  FOR UPDATE USING ((select public.current_user_role()) = 'admin');

CREATE POLICY membership_delete ON public."Membership"
  FOR DELETE USING ((select public.current_user_role()) = 'admin');

-- ============ Exercise ============
CREATE POLICY exercise_select ON public."Exercise"
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY exercise_insert ON public."Exercise"
  FOR INSERT WITH CHECK ((select public.current_user_role()) IN ('admin', 'trainer'));

CREATE POLICY exercise_update ON public."Exercise"
  FOR UPDATE USING ((select public.current_user_role()) IN ('admin', 'trainer'));

CREATE POLICY exercise_delete ON public."Exercise"
  FOR DELETE USING ((select public.current_user_role()) IN ('admin', 'trainer'));

-- ============ WorkoutTemplate ============
CREATE POLICY workout_template_select ON public."WorkoutTemplate"
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY workout_template_insert ON public."WorkoutTemplate"
  FOR INSERT WITH CHECK ((select public.current_user_role()) IN ('admin', 'trainer'));

CREATE POLICY workout_template_update ON public."WorkoutTemplate"
  FOR UPDATE USING ((select public.current_user_role()) IN ('admin', 'trainer'));

CREATE POLICY workout_template_delete ON public."WorkoutTemplate"
  FOR DELETE USING ((select public.current_user_role()) IN ('admin', 'trainer'));

-- ============ WorkoutTemplateItem ============
CREATE POLICY workout_template_item_select ON public."WorkoutTemplateItem"
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY workout_template_item_insert ON public."WorkoutTemplateItem"
  FOR INSERT WITH CHECK ((select public.current_user_role()) IN ('admin', 'trainer'));

CREATE POLICY workout_template_item_update ON public."WorkoutTemplateItem"
  FOR UPDATE USING ((select public.current_user_role()) IN ('admin', 'trainer'));

CREATE POLICY workout_template_item_delete ON public."WorkoutTemplateItem"
  FOR DELETE USING ((select public.current_user_role()) IN ('admin', 'trainer'));

-- ============ Program ============
CREATE POLICY program_select ON public."Program"
  FOR SELECT USING (
    "clientId" = (select auth.uid())
    OR "trainerId" = (select auth.uid())
    OR (select public.current_user_role()) = 'admin'
  );

CREATE POLICY program_insert ON public."Program"
  FOR INSERT WITH CHECK ((select public.current_user_role()) IN ('admin', 'trainer'));

CREATE POLICY program_update ON public."Program"
  FOR UPDATE USING ((select public.current_user_role()) IN ('admin', 'trainer'));

CREATE POLICY program_delete ON public."Program"
  FOR DELETE USING ((select public.current_user_role()) IN ('admin', 'trainer'));

-- ============ WorkoutLog ============
-- Остается FOR ALL, так как это единственная политика (нет перекрытия с FOR SELECT)
CREATE POLICY workout_log_all ON public."WorkoutLog"
  FOR ALL USING (
    "userId" = (select auth.uid())
    OR (select public.current_user_role()) = 'admin'
    OR (
      (select public.current_user_role()) = 'trainer'
      AND "userId" IN (
        SELECT "clientId" FROM public."Program" WHERE "trainerId" = (select auth.uid())
      )
    )
  );

-- ============ ExerciseLog ============
CREATE POLICY exercise_log_all ON public."ExerciseLog"
  FOR ALL USING (
    "workoutLogId" IN (
      SELECT id FROM public."WorkoutLog"
      WHERE "userId" = (select auth.uid())
        OR (select public.current_user_role()) = 'admin'
        OR (
          (select public.current_user_role()) = 'trainer'
          AND "userId" IN (
            SELECT "clientId" FROM public."Program" WHERE "trainerId" = (select auth.uid())
          )
        )
    )
  );

-- ============ Measurement ============
CREATE POLICY measurement_all ON public."Measurement"
  FOR ALL USING (
    "userId" = (select auth.uid())
    OR (select public.current_user_role()) = 'admin'
    OR (
      (select public.current_user_role()) = 'trainer'
      AND "userId" IN (
        SELECT "clientId" FROM public."Program" WHERE "trainerId" = (select auth.uid())
      )
    )
  );

-- ============ DeviceIntegration ============
CREATE POLICY device_integration_all ON public."DeviceIntegration"
  FOR ALL USING (
    "userId" = (select auth.uid())
  );
