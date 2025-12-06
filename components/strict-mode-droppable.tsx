"use client"

import { useEffect, useState } from "react"
import { Droppable, DroppableProps } from "react-beautiful-dnd"

/**
 * StrictModeDroppable - React 18のStrict Modeでreact-beautiful-dndを動作させるためのラッパー
 * 
 * React 18のStrict Modeでは、コンポーネントが2回マウントされるため、
 * react-beautiful-dndのDroppableが正しく動作しません。
 * このラッパーは、クライアントサイドでのみDroppableをレンダリングすることで問題を回避します。
 */
export function StrictModeDroppable({ children, ...props }: DroppableProps) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    // アニメーションフレームを使用して、DOMが安定した後にDroppableを有効化
    const animation = requestAnimationFrame(() => setEnabled(true))
    return () => {
      cancelAnimationFrame(animation)
      setEnabled(false)
    }
  }, [])

  if (!enabled) {
    return null
  }

  return <Droppable {...props}>{children}</Droppable>
}
