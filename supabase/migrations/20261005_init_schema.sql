-- ==============================================================================
-- Pomodoroz Database Schema & Row Level Security (RLS) Policies
-- Migration: 20261005_init_schema.sql
--
-- 安全说明：
-- 1. 采用严格多租户行级安全（RLS），所有表的主键或联合主键均绑定 auth.users(id)；
-- 2. 匿名用户 (anon) 在没有有效 JWT 时无任何读写权限 (auth.uid() IS NULL)；
-- 3. 用户 A 绝对无法读取、新增、修改或删除用户 B 的任何数据；
-- 4. 前端应用仅配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY，严禁使用 service_role！
-- ==============================================================================

-- 1. 用户设置表 (user_settings)
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 一级任务列表/分组表 (task_lists)
CREATE TABLE IF NOT EXISTS public.task_lists (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  priority BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  day_color TEXT DEFAULT NULL,
  day_color_date TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

-- 3. 二级任务卡片表 (tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  list_id TEXT NOT NULL,
  text TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT false,
  prioritized BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  importance INT NOT NULL DEFAULT 3,
  urgency INT NOT NULL DEFAULT 3,
  schedule JSONB DEFAULT NULL,
  completed_dates JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

-- 4. 逻辑专注会话记录表 (focus_sessions)
-- 注意：session_id 作为客户端生成的稳定全局唯一 ID，幂等保存，防止重试导致统计次数膨胀
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  bucket TEXT NOT NULL,
  timer_type TEXT NOT NULL,
  duration_seconds INT NOT NULL,
  started_at BIGINT NOT NULL,
  completed_at BIGINT NOT NULL,
  date TEXT NOT NULL,
  round INT DEFAULT NULL,
  total_rounds INT DEFAULT NULL,
  cycle_completed BOOLEAN NOT NULL DEFAULT false,
  task_id TEXT DEFAULT NULL,
  task_text TEXT DEFAULT NULL,
  list_id TEXT DEFAULT NULL,
  list_title TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, session_id)
);

-- 创建索引以加速按用户和时间查询
CREATE INDEX IF NOT EXISTS idx_task_lists_user ON public.task_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_list ON public.tasks(user_id, list_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON public.focus_sessions(user_id, date);

-- ==============================================================================
-- 启用 Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS 策略：user_settings
-- ------------------------------------------------------------------------------
CREATE POLICY "user_settings_select_own"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert_own"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update_own"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_delete_own"
  ON public.user_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS 策略：task_lists
-- ------------------------------------------------------------------------------
CREATE POLICY "task_lists_select_own"
  ON public.task_lists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "task_lists_insert_own"
  ON public.task_lists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "task_lists_update_own"
  ON public.task_lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "task_lists_delete_own"
  ON public.task_lists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS 策略：tasks
-- ------------------------------------------------------------------------------
CREATE POLICY "tasks_select_own"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS 策略：focus_sessions
-- ------------------------------------------------------------------------------
CREATE POLICY "focus_sessions_select_own"
  ON public.focus_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "focus_sessions_insert_own"
  ON public.focus_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "focus_sessions_update_own"
  ON public.focus_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "focus_sessions_delete_own"
  ON public.focus_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 启用 Realtime 广播（支持跨设备变更自动推送到已连接客户端）
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_lists;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.focus_sessions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
