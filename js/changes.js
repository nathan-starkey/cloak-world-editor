function Changes(callbackFn, thisArg) {
  let undoStack = [];
  let redoStack = [];
  let returnValue = undoStack;

  Object.defineProperties(returnValue, {
    redoStack: {value: redoStack},
    push: {value: push, writable: true},
    undo: {value: undo, writable: true},
    redo: {value: redo, writable: true},
    canUndo: {value: canUndo, writable: true},
    canRedo: {value: canRedo, writable: true}
  });

  returnValue.redoStack = redoStack;

  function push(item, execute = true) {
    Array.prototype.push.call(undoStack, item);
    redoStack.length = 0;
    if (execute) executeCommand(item[0]);
  }

  function undo() {
    if (undoStack.length != 0) {
      let item = undoStack.pop();
      redoStack.push(item);
      executeCommand(item[1]);
    }
  }

  function redo() {
    if (redoStack.length != 0) {
      let item = redoStack.pop();
      Array.prototype.push.call(undoStack, item);
      executeCommand(item[0]);
    }
  }

  function executeCommand(command) {
    if (Array.isArray(command)) {
      for (let command_ of command) {
        command_();
      }
    } else {
      command();
    }
    
    if (callbackFn) {
      callbackFn.call(thisArg);
    }
  }

  function canUndo() {
    return undoStack.length != 0;
  };

  function canRedo() {
    return redoStack.length != 0;
  }

  return returnValue;
}