/**
 * dnd-kit 用の pointer-first 3 段 hybrid collision detection。
 *
 * 直感に反する `closestCenter` 単独の挙動 (= 高さの違う row が混在すると
 * 中心点距離で判定して 2-3 行分動かさないと反応しない) を回避する共通実装。
 *
 * 戦略 (上から順に試行):
 *   1. **pointerWithin**: user の pointer が直接乗っている droppable を選ぶ
 *      → 高さが違っても pointer 位置に直結、最も直感的
 *   2. **rectIntersection**: 重なっている droppable
 *   3. **closestCenter**: 上記でも見つからなければ中心距離
 *
 * 利用想定: subtasks-panel / backlog-view / kanban-view 等の DnD で
 * `<DndContext collisionDetection={pointerFirstCollision}>` として渡すだけ。
 *
 * 参考: dnd-kit docs "Custom collision detection algorithms"
 */
import {
  closestCenter,
  type CollisionDetection,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core'

export const pointerFirstCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  const intersections = rectIntersection(args)
  if (intersections.length > 0) return intersections
  return closestCenter(args)
}
