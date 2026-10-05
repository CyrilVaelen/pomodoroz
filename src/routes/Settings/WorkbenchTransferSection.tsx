import React, { useRef, useState } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import {
  StyledSettingSection,
  StyledSectionHeading,
  StyledButtonPrimary,
  StyledButtonNormal,
} from "styles";
import {
  createWorkbenchBackup,
  validateWorkbenchBackup,
  applyWorkbenchBackup,
  canRollbackWorkbenchBackup,
  rollbackWorkbenchBackup,
  PomodorozWorkbenchBackup,
  WorkbenchValidationResult,
} from "utils/workbenchTransfer";

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.2rem;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: 6px;
  margin-top: 0.8rem;
`;

const StyledRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.8rem;
`;

const StyledDescription = styled.p`
  font-size: 1.15rem;
  color: var(--color-body-text);
  line-height: 1.5;
`;

const StyledButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
`;

const StyledHiddenFileInput = styled.input`
  display: none;
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

const StyledPreviewDialog = styled.div`
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  border: 1px solid var(--color-border-primary);
  padding: 2rem;
  width: 90%;
  max-width: 42rem;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const StyledPreviewTitle = styled.h3`
  font-size: 1.4rem;
  color: var(--color-heading-text);
  margin: 0;
`;

const StyledPreviewList = styled.ul`
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.8rem;
  padding: 0.8rem;
  background-color: var(--color-bg-secondary);
  border-radius: 4px;
  border: 1px solid var(--color-border-primary);

  li {
    font-size: 1.2rem;
    color: var(--color-heading-text);
    span {
      font-weight: 600;
      color: var(--color-primary-text);
    }
  }
`;

const StyledNoticeText = styled.p`
  font-size: 1.1rem;
  color: var(--color-disabled-text);
  line-height: 1.4;
`;

const StyledAlert = styled.div<{ $success?: boolean }>`
  padding: 0.8rem 1rem;
  border-radius: 4px;
  font-size: 1.15rem;
  background-color: ${(p) =>
    p.$success ? "rgba(16, 185, 129, 0.1)" : "rgba(219, 51, 82, 0.1)"};
  color: ${(p) => (p.$success ? "var(--color-green)" : "var(--color-pink)")};
`;

export const WorkbenchTransferSection: React.FC = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewData, setPreviewData] = useState<{
    backup: PomodorozWorkbenchBackup;
    summary: {
      listCount: number;
      taskCount: number;
      sessionCount: number;
      hasSettings: boolean;
    };
  } | null>(null);

  const [feedback, setFeedback] = useState<{
    msg: string;
    success: boolean;
  } | null>(null);
  const [hasRollback, setHasRollback] = useState(() =>
    canRollbackWorkbenchBackup()
  );

  const handleExport = () => {
    try {
      const backup = createWorkbenchBackup();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pomodoroz-workbench-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedback({ msg: "工作台完整备份导出成功", success: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "导出失败";
      setFeedback({ msg: `导出失败: ${msg}`, success: false });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const validation: WorkbenchValidationResult =
          validateWorkbenchBackup(parsed);

        if (!validation.ok) {
          setFeedback({
            msg: `校验失败: ${validation.message}`,
            success: false,
          });
          return;
        }

        setPreviewData({
          backup: validation.data,
          summary: validation.summary,
        });
      } catch (err: unknown) {
        setFeedback({
          msg: "文件解析失败，请确认选择的是合法的 JSON 备份文件",
          success: false,
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    try {
      const res = await applyWorkbenchBackup(previewData.backup);
      if (res.success) {
        setFeedback({
          msg: `成功导入工作台：${res.importedLists} 个列表，${res.importedTasks} 个任务，${res.importedSessions} 条有效专注记录`,
          success: true,
        });
        setHasRollback(true);
      } else {
        setFeedback({ msg: `导入失败: ${res.error}`, success: false });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "导入异常";
      setFeedback({ msg: `导入异常: ${msg}`, success: false });
    } finally {
      setPreviewData(null);
    }
  };

  const handleRollback = () => {
    const ok = rollbackWorkbenchBackup();
    if (ok) {
      setFeedback({
        msg: "已成功回滚到导入前的工作台状态",
        success: true,
      });
      setHasRollback(false);
    } else {
      setFeedback({
        msg: "未找到有效的导入前快照，无法回滚",
        success: false,
      });
    }
  };

  return (
    <StyledSettingSection>
      <StyledSectionHeading>
        {t(
          "settings.workbenchTransferTitle",
          "工作台完整数据迁移与备份"
        )}
      </StyledSectionHeading>

      <StyledContainer>
        <StyledDescription>
          导出包含全部待办任务、5×5矩阵评分与排期、全局主题设置以及历史有效专注记录的完整备份，支持在不同设备或域名间跨站迁移。
        </StyledDescription>

        <StyledRow>
          <StyledButtonGroup>
            <StyledButtonPrimary type="button" onClick={handleExport}>
              导出工作台备份 (JSON)
            </StyledButtonPrimary>
            <StyledButtonNormal
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              导入备份文件...
            </StyledButtonNormal>
            {hasRollback && (
              <StyledButtonNormal
                type="button"
                onClick={handleRollback}
              >
                撤销上次导入 (回滚)
              </StyledButtonNormal>
            )}
            <StyledHiddenFileInput
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </StyledButtonGroup>
        </StyledRow>

        {feedback && (
          <StyledAlert $success={feedback.success}>
            {feedback.msg}
          </StyledAlert>
        )}
      </StyledContainer>

      {/* 导入前数据量预览与确认弹窗 (A20) */}
      {previewData && (
        <StyledModalOverlay onClick={() => setPreviewData(null)}>
          <StyledPreviewDialog onClick={(e) => e.stopPropagation()}>
            <StyledPreviewTitle>
              待导入工作台数据预览
            </StyledPreviewTitle>
            <StyledNoticeText>
              请核对备份文件中的数据量。确认后将保留原本机数据副本，并按任务
              ID 及专注会话 ID 幂等合并，不会产生重复记录。
            </StyledNoticeText>

            <StyledPreviewList>
              <li>
                任务分组：
                <span>{previewData.summary.listCount} 个</span>
              </li>
              <li>
                二级卡片：
                <span>{previewData.summary.taskCount} 个</span>
              </li>
              <li>
                专注历史：
                <span>{previewData.summary.sessionCount} 条</span>
              </li>
              <li>
                主题与偏好：
                <span>
                  {previewData.summary.hasSettings
                    ? "包含配置项"
                    : "无"}
                </span>
              </li>
            </StyledPreviewList>

            <StyledButtonGroup style={{ justifyContent: "flex-end" }}>
              <StyledButtonNormal
                type="button"
                onClick={() => setPreviewData(null)}
              >
                取消
              </StyledButtonNormal>
              <StyledButtonPrimary
                type="button"
                onClick={handleConfirmImport}
              >
                确认并导入
              </StyledButtonPrimary>
            </StyledButtonGroup>
          </StyledPreviewDialog>
        </StyledModalOverlay>
      )}
    </StyledSettingSection>
  );
};

export default React.memo(WorkbenchTransferSection);
