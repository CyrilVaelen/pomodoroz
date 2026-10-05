import { SVGTypes } from "components";
import { TaskList, Config, Timer, Settings, Statistics } from "routes";

export const APP_NAME = "Pomodoroz";
export const APP_VERSION = __POMODOROZ_APP_VERSION__;

type NavItemTypes = {
  name: string;
  icon: SVGTypes["name"];
  exact: boolean;
  path: string;
  component: React.FC;
  notify: boolean;
};

export const routes: (
  hasUpdateNotification?: boolean
) => NavItemTypes[] = (hasUpdateNotification = false) => [
  {
    icon: "task",
    name: "nav.taskList",
    exact: false,
    path: "/task-list",
    component: TaskList,
    notify: false,
  },
  {
    icon: "config",
    name: "nav.config",
    exact: true,
    path: "/config",
    component: Config,
    notify: false,
  },
  {
    icon: "timer",
    name: "nav.timer",
    exact: true,
    path: "/",
    component: Timer,
    notify: false,
  },
  {
    icon: "statistics",
    name: "nav.statistics",
    exact: true,
    path: "/statistics",
    component: Statistics,
    notify: false,
  },
  {
    icon: "settings",
    name: "nav.settings",
    exact: true,
    path: "/settings",
    component: Settings,
    notify: hasUpdateNotification,
  },
];

export const compactRoutes: NavItemTypes[] = [
  {
    icon: "timer",
    name: "nav.timer",
    exact: false,
    path: "/",
    component: Timer,
    notify: false,
  },
];
