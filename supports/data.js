const SupportData = (() => {
  const limits = {'first-then':[2,2], 'choice-board':[2,12], 'task-strip':[1,12], 'now-next-later':[3,3], 'calm-down':[2,12]};
  function text(value, max) {
    if (typeof value !== 'string' || value.length > max) throw new Error('A label is missing or too long.');
    return value;
  }
  function validate(payload, expectedType) {
    if (!payload || payload.format !== 'visual-support-board' || payload.version !== 1 || !payload.board) throw new Error('Choose a visual support file exported from this site.');
    const board = payload.board;
    if (!Object.hasOwn(limits, board.type) || (expectedType && board.type !== expectedType)) throw new Error('This file belongs to a different kind of board. Open its matching page to import it.');
    const [min,max] = limits[board.type];
    if (!Array.isArray(board.cards) || board.cards.length < min || board.cards.length > max) throw new Error(`This board needs ${min === max ? min : `${min}–${max}`} cards.`);
    const cards = board.cards.map(card => {
      if (!card || (card.pictogramId !== null && (!Number.isSafeInteger(card.pictogramId) || card.pictogramId < 1))) throw new Error('The file contains an invalid picture.');
      if (typeof card.marked !== 'boolean') throw new Error('The file contains an invalid card selection.');
      return {label:text(card.label,100), pictogramId:card.pictogramId, marked:card.marked};
    });
    if (['choice-board','calm-down'].includes(board.type) && cards.filter(card=>card.marked).length > 1) throw new Error('Choose one option at a time.');
    const layout = board.layout || {rows:0, columns:0};
    for (const value of [layout.rows,layout.columns]) if (!Number.isInteger(value) || value<0 || value>12) throw new Error("Choose Auto or a layout between 1 and 12.");
    return {layout:{rows:layout.rows,columns:layout.columns}, type:board.type, title:text(board.title,100), person:text(board.person,100), cards};
  }
  function serialize(board) {return {format:'visual-support-board',version:1,board:validate({format:'visual-support-board',version:1,board})};}
  return {validate,serialize,limits};
})();
