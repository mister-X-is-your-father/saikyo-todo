/**
 * Core プラグイン一括登録 barrel。
 *
 * 各 plugin ファイルを import するだけ (module side-effect で register される設計にせず、
 * ここで明示的に `register*(...)` を呼ぶ方が、Next.js の tree-shaking / RSC 境界で
 * 意図しない重複登録を防げる)。
 *
 * このファイルを import する側 (e.g. layout / provider) で 1 回呼ぶ:
 *     import { registerCorePlugins } from '@/plugins/core'
 *     registerCorePlugins()
 *
 * register* は id 上書きなので多重呼び出しでも害なし (idempotent)。
 */
import { registerAction, registerView } from '../registry'
import { reloadItemsAction } from './actions/reload-items'
import { backlogViewPlugin } from './views/backlog'
import { dashboardViewPlugin } from './views/dashboard'
import { ganttViewPlugin } from './views/gantt'
import { kanbanViewPlugin } from './views/kanban'

let registered = false

export function registerCorePlugins(): void {
  if (registered) return
  registerAction(reloadItemsAction)
  registerView(kanbanViewPlugin)
  registerView(backlogViewPlugin)
  registerView(ganttViewPlugin)
  registerView(dashboardViewPlugin)
  registered = true
}
