/**
 * 节点图标映射
 * 节点目录里用字符串记录图标名，这里统一映射为组件，
 * 新增节点类型时只需在此登记一次。
 */
import {
  VideoPlay,
  MagicStick,
  Collection,
  Cpu,
  Grid,
  Link,
  Connection,
  Document,
  Coin,
  EditPen,
  Refresh,
  Aim,
  Share,
  RefreshRight,
  Position,
  ChatDotSquare,
  Files,
  DataLine,
  SwitchButton,
} from '@element-plus/icons-vue'

export const NODE_ICONS = {
  VideoPlay,
  MagicStick,
  Collection,
  Cpu,
  Grid,
  Link,
  Connection,
  Document,
  Coin,
  EditPen,
  Refresh,
  Aim,
  Share,
  RefreshRight,
  Position,
  ChatDotSquare,
  Files,
  DataLine,
  SwitchButton,
}

export function iconOf(name) {
  return NODE_ICONS[name] || Grid
}

/** 节点卡片尺寸，画布与连线计算共用 */
export const NODE_W = 200
export const NODE_H = 64

/** 输出端口在节点右侧的纵坐标偏移（相对节点顶部） */
export function outputPortY(index, total) {
  if (total <= 1) return NODE_H / 2
  const gap = NODE_H / (total + 1)
  return gap * (index + 1)
}

/** 输入端口在节点左侧的纵坐标偏移 */
export const INPUT_PORT_Y = NODE_H / 2
