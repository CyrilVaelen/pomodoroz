import React, { useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import {
  StyledSettingSection,
  StyledSectionHeading,
  StyledButtonPrimary,
  StyledButtonNormal,
} from "styles";
import {
  isSupabaseConfigured,
  getCurrentUser,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  onAuthStateChange,
  syncEngine,
  SyncStatus,
} from "services/supabase";

const StyledStatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1.2rem;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: 6px;
  margin-top: 0.8rem;
`;

const StyledUserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const StyledUserEmail = styled.span`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading-text);
`;

const StyledStatusBadge = styled.span<{ $status: SyncStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1.1rem;
  font-weight: 500;
  color: ${(p) => {
    switch (p.$status) {
      case "syncing":
        return "var(--color-primary-text)";
      case "offline":
        return "var(--color-yellow)";
      case "error":
        return "var(--color-pink)";
      case "idle":
      default:
        return "var(--color-green)";
    }
  }};

  &::before {
    content: "";
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background-color: currentColor;
  }
`;

const StyledButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
`;

const StyledModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
`;

const StyledAuthDialog = styled.div`
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  border: 1px solid var(--color-border-primary);
  padding: 2rem;
  width: 90%;
  max-width: 36rem;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
`;

const StyledAuthHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    margin: 0;
    font-size: 1.4rem;
    color: var(--color-heading-text);
  }
`;

const StyledCloseBtn = styled.button`
  background: transparent;
  border: none;
  font-size: 1.6rem;
  color: var(--color-disabled-text);
  cursor: pointer;

  &:hover {
    color: var(--color-heading-text);
  }
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  label {
    font-size: 1.1rem;
    color: var(--color-disabled-text);
  }

  input {
    padding: 0.7rem 0.9rem;
    border-radius: 4px;
    border: 1px solid var(--color-border-primary);
    background-color: var(--color-bg-secondary);
    color: var(--color-heading-text);
    font-size: 1.2rem;

    &:focus {
      outline: 2px solid var(--color-primary-focus);
    }
  }
`;

const StyledAuthError = styled.div`
  color: var(--color-pink);
  font-size: 1.1rem;
  background-color: rgba(219, 51, 82, 0.1);
  padding: 0.6rem 0.8rem;
  border-radius: 4px;
`;

const StyledNoticeBox = styled.div`
  padding: 1rem;
  background-color: var(--color-bg-secondary);
  border: 1px dashed var(--color-border-primary);
  border-radius: 6px;
  font-size: 1.15rem;
  color: var(--color-body-text);
  line-height: 1.5;
  margin-top: 0.8rem;
`;

const StyledFeedback = styled.div<{ $success?: boolean }>`
  margin-top: 0.8rem;
  padding: 0.8rem;
  border-radius: 4px;
  font-size: 1.15rem;
  background-color: ${(p) =>
    p.$success ? "rgba(16, 185, 129, 0.1)" : "rgba(219, 51, 82, 0.1)"};
  color: ${(p) => (p.$success ? "var(--color-green)" : "var(--color-pink)")};
`;

export const CloudSyncSection: React.FC = () => {
  const { t } = useTranslation();
  const configured = isSupabaseConfigured();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    msg: string;
    success: boolean;
  } | null>(null);

  useEffect(() => {
    if (!configured) return;

    getCurrentUser().then((u) => {
      setUserEmail(u?.email || null);
      if (u) {
        syncEngine.initRealtime();
      }
    });

    const { data } = onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
      if (session?.user) {
        syncEngine.initRealtime();
        syncEngine.pullChanges();
      } else {
        syncEngine.stopRealtime();
      }
    });

    const unsubSync = syncEngine.subscribeStatus((st) =>
      setSyncStatus(st)
    );

    return () => {
      data.subscription.unsubscribe();
      unsubSync();
    };
  }, [configured]);

  const handleOpenAuth = (register = false) => {
    setIsRegisterMode(register);
    setAuthError("");
    setEmailInput("");
    setPasswordInput("");
    setShowAuthModal(true);
  };

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;

    setIsSubmitting(true);
    setAuthError("");

    try {
      if (isRegisterMode) {
        const { error } = await signUpWithEmail(
          emailInput,
          passwordInput
        );
        if (error) throw error;
        setFeedback({
          msg: "注册成功！请查收验证邮件或直接登录",
          success: true,
        });
        setShowAuthModal(false);
      } else {
        const { error } = await signInWithEmail(
          emailInput,
          passwordInput
        );
        if (error) throw error;
        setShowAuthModal(false);
        setFeedback({
          msg: "登录成功，已开启跨设备实时同步",
          success: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "认证请求失败";
      setAuthError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUserEmail(null);
    setFeedback({ msg: "已安全退出登录", success: true });
  };

  const handleManualSync = async () => {
    setFeedback(null);
    try {
      await syncEngine.processQueue();
      await syncEngine.pullChanges();
      setFeedback({ msg: "同步完成，数据已与云端对齐", success: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误";
      setFeedback({ msg: `同步失败: ${msg}`, success: false });
    }
  };

  const handleMigrateLocal = async () => {
    setFeedback(null);
    try {
      const res = await syncEngine.migrateLocalDataToCloud();
      setFeedback({
        msg: `成功将本机数据上传到云端：${res.listCount} 个分组，${res.taskCount} 个任务，${res.sessionCount} 条专注记录`,
        success: true,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误";
      setFeedback({ msg: `上传失败: ${msg}`, success: false });
    }
  };

  const getStatusText = (status: SyncStatus) => {
    switch (status) {
      case "syncing":
        return "同步中...";
      case "offline":
        return "离线模式 (变更已保留在本地队列)";
      case "error":
        return "同步异常";
      case "idle":
      default:
        return "已连接并同步";
    }
  };

  return (
    <StyledSettingSection>
      <StyledSectionHeading>
        {t("settings.cloudSyncTitle", "云端同步与账号 (Supabase)")}
      </StyledSectionHeading>

      {!configured ? (
        <StyledNoticeBox>
          <p>
            <strong>未配置 Supabase 服务：</strong>
            当前运行于纯本地离线模式，所有任务与历史专注数据完整保存在本机浏览器中。
          </p>
          <p style={{ marginTop: "0.4rem" }}>
            如需跨设备同步，请在环境变量中配置{" "}
            <code>VITE_SUPABASE_URL</code> 与{" "}
            <code>VITE_SUPABASE_ANON_KEY</code>。
          </p>
        </StyledNoticeBox>
      ) : (
        <>
          <StyledStatusRow>
            <StyledUserInfo>
              <StyledUserEmail>
                {userEmail ? userEmail : "未登录账号 (本地访客模式)"}
              </StyledUserEmail>
              {userEmail && (
                <StyledStatusBadge $status={syncStatus}>
                  {getStatusText(syncStatus)}
                </StyledStatusBadge>
              )}
            </StyledUserInfo>

            <StyledButtonGroup>
              {userEmail ? (
                <>
                  <StyledButtonNormal
                    type="button"
                    onClick={handleManualSync}
                  >
                    立即同步
                  </StyledButtonNormal>
                  <StyledButtonNormal
                    type="button"
                    onClick={handleMigrateLocal}
                  >
                    上传本机数据至云端
                  </StyledButtonNormal>
                  <StyledButtonNormal
                    type="button"
                    onClick={handleSignOut}
                  >
                    退出登录
                  </StyledButtonNormal>
                </>
              ) : (
                <>
                  <StyledButtonPrimary
                    type="button"
                    onClick={() => handleOpenAuth(false)}
                  >
                    登录
                  </StyledButtonPrimary>
                  <StyledButtonNormal
                    type="button"
                    onClick={() => handleOpenAuth(true)}
                  >
                    注册账号
                  </StyledButtonNormal>
                </>
              )}
            </StyledButtonGroup>
          </StyledStatusRow>

          {feedback && (
            <StyledFeedback $success={feedback.success}>
              {feedback.msg}
            </StyledFeedback>
          )}

          {showAuthModal && (
            <StyledModalOverlay onClick={() => setShowAuthModal(false)}>
              <StyledAuthDialog onClick={(e) => e.stopPropagation()}>
                <StyledAuthHeader>
                  <h3>
                    {isRegisterMode
                      ? "注册 Pomodoroz 账号"
                      : "登录账号"}
                  </h3>
                  <StyledCloseBtn
                    onClick={() => setShowAuthModal(false)}
                  >
                    ×
                  </StyledCloseBtn>
                </StyledAuthHeader>

                {authError && (
                  <StyledAuthError>{authError}</StyledAuthError>
                )}

                <StyledForm onSubmit={handleSubmitAuth}>
                  <StyledInputGroup>
                    <label>邮箱地址</label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </StyledInputGroup>

                  <StyledInputGroup>
                    <label>密码</label>
                    <input
                      type="password"
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                    />
                  </StyledInputGroup>

                  <StyledButtonGroup style={{ marginTop: "0.8rem" }}>
                    <StyledButtonPrimary
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "处理中..."
                        : isRegisterMode
                          ? "创建账号"
                          : "立即登录"}
                    </StyledButtonPrimary>
                    <StyledButtonNormal
                      type="button"
                      onClick={() => setIsRegisterMode(!isRegisterMode)}
                    >
                      {isRegisterMode
                        ? "已有账号？去登录"
                        : "没有账号？去注册"}
                    </StyledButtonNormal>
                  </StyledButtonGroup>
                </StyledForm>
              </StyledAuthDialog>
            </StyledModalOverlay>
          )}
        </>
      )}
    </StyledSettingSection>
  );
};

export default React.memo(CloudSyncSection);
