// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// jsdom は scrollIntoView を実装していないため、テスト用のスタブを用意する。
// (例: TodoListPanel の「このタスクでポモドーロを開始」がタイマー位置へスクロールする)
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}
