import { TimerStatus } from "store/timer/types";

/**
 * 判断当前是否应当隐藏已用时数字。
 * 业务规则：只有在正计时模式 (COUNT_UP) 且用户偏好设置为 true 时才隐藏；
 * 番茄钟及休息倒计时绝不受此选项影响。
 */
export const isCountUpElapsedTimeHidden = (
  hideCountUpElapsedTime: boolean | undefined,
  timerType?: TimerStatus
): boolean => {
  return (
    Boolean(hideCountUpElapsedTime) &&
    timerType === TimerStatus.COUNT_UP
  );
};
