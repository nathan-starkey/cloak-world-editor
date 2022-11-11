class UndoRedoStack extends EventTarget {
  undoStack = [];
  redoStack = [];
  
  push(command, execute = true) {
    execute && command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.dispatchEvent(new CustomEvent("change", {detail: {type: "push", command}}));
  }
  
  canUndo() {
    return this.undoStack.length != 0;
  }
  
  canRedo() {
    return this.redoStack.length != 0;
  }
  
  undo() {
    if (this.canUndo()) {
      let command = this.undoStack.pop();
      
      command.undo();
      
      this.redoStack.push(command);
      this.dispatchEvent(new CustomEvent("change", {detail: {type: "undo", command}}));
    }
  }
  
  redo() {
    if (this.canRedo()) {
      let command = this.redoStack.pop();
      
      command.execute();
      
      this.undoStack.push(command);
      this.dispatchEvent(new CustomEvent("change", {detail: {type: "redo", command}}));
    }
  }
}


class SaveableUndoRedoStack extends UndoRedoStack {
  savedCommand;
  
  save(success = undefined) {
    if (success == undefined) {
      this.dispatchEvent(new Event("save"));
    } else if (success) {
      this.undoStack[this.undoStack.length - 1] == this.savedCommand
      this.dispatchEvent(new Event("savesuccess"));
    } else {
      this.dispatchEvent(new Event("savefail"));
    }
  }
  
  isSaved() {
    return this.undoStack[this.undoStack.length - 1] == this.savedCommand;
  }
}


class FunctionCallCommand { // adheres to the Command protocol
  constructor(callbackFn, thisArg, args) {
    this.execute = () => callbackFn.apply(thisArg, args);
  }
}


class PropertySetCommand { // adheres to the Command protocol
  constructor(object, key, value) {
    this.execute = () => object[key] = value;
  }
}


class ArrayPushCommand { // adheres to the Command protocol
  constructor(array, value) {
    this.execute = () => array.push(value);
  }
}


class ArrayPopCommand { // adheres to the Command protocol
  constructor(array) {
    this.execute = () => array.pop();
  }
}


class ArraySpliceCommand { // adheres to the Command protocol
  constructor(array, index, count, items = []) {
    this.execute = () => array.splice(index, count, ...items);
  }
}


class MultipleCommands { // adheres to the UndoableCommand protocol
  constructor(...commands) {
    commands = commands.flat();
    
    this.execute = () => {
      for (let command of commands) {
        command.execute();
      }
    };
    
    this.undo = () => {
      for (let i = commands.length - 1; i >= 0; --i) {
        commands[i].undo();
      }
    };
  }
}


class UndoableCommand { // adheres to the UndoableCommand protocol
  constructor(redoCommand, undoCommand) {
    this.execute = () => redoCommand.execute();
    this.undo = () => undoCommand.execute();
  }
}