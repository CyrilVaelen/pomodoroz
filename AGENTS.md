# Agent 阅读入口

本地「规划工作台」只用四个项目管理上下文文件：

- [PROJECT.md](PROJECT.md)：长期产品、架构和角色边界。
- [ACCEPTANCE.md](ACCEPTANCE.md)：通用质量标准与风险分级。
- [TASK.md](TASK.md)：当前唯一任务。
- [STATUS.md](STATUS.md)：当前执行结果及待验收事项。

任务/验收先读 TASK、STATUS，再看差异与必要上下游；新对话首次恢复或长期规则变化时补读 PROJECT、ACCEPTANCE。用户当前明确决定优先。

本文件只作入口，不另存规则、任务或状态。Codex 规划与验收，Antigravity 编码、自检和交付，用户最终决定；用户直接交给 Codex 的文档管理任务可由 Codex 执行。

本地四文件流程取代上游原有强制 ADR/OpenSpec/RETOMADA 管理方式。保留的上游工程、审计、路线图和 OpenSpec 资料仅按需参考，不自动重放历史任务或创建新规范。真实工程文件及许可继续保留。
