class Queue {
  items = [];
  
  next() {
    return this.items.shift();
  }
  
  push(item) {
    if (this.items.indexOf(item) == -1) {
      this.items.push(item);
    }
  }
  
  purge(item) {
    let index = this.items.indexOf(item);
    
    if (index != -1) {
      this.items.splice(index, 1);
    }
  }
}


class RenderObject { // the RenderObject protocol
  render() {
    throw new Error("not implemented");
  }
  
  draw(context) {
    throw new Error("not implemented");
  }
}


class QueuedRenderer { // adheres to the RenderObject protocol
  queue = new Queue();
  items = [];
  
  add(item) {
    if (this.items.indexOf(item) == -1) {
      this.items.push(item);
      this.queue.push(item);
    }
  }
  
  remove(item) {
    let index = this.items.indexOf(item);
    
    if (index != -1) {
      this.items.splice(index, 1);
      this.queue.purge(item);
    }
  }
  
  pushToQueue(item) {
    if (this.items.indexOf(item) != -1) {
      this.queue.push(item);
    }
  }
  
  render() {
    let item = this.queue.next();
    
    if (item) {
      item.render();
    }
  }
  
  draw(context) {
    for (let item of this.items) {
      item.draw(context);
    }
  }
}


class BlendedRenderer { // adheres to the RenderObject protocol
  items = [];
  blend = 0;
  
  add(item) {
    if (this.items.indexOf(item) == -1) {
      this.items.push(item);
    }
  }
  
  render() {
    for (let item of this.items) {
      item.render();
    }
  }
  
  draw(context) {
    let index = parseInt(this.blend);
    let blend = this.blend - index;
    let item0 = this.items[index];
    let item1 = this.items[index + 1];
    
    context.globalAlpha = 1;
    
    if (item0) {
      item0.draw(context);
    }
    
    if (item1) {
      context.globalAlpha = blend;
      
      item1.draw(context);
    }
  }
}


class ScaleBlendedQueuedRenderers { // adheres to the RenderObject protocol
  layers = new BlendedRenderer();
  layer0 = new QueuedRenderer();
  layer1 = new QueuedRenderer();
  then = 0;
  blend = 0;
  duration = 1/6;
  
  constructor(scaleThreshold, viewMatrix) {
    this.scaleThreshold = scaleThreshold;
    this.viewMatrix = viewMatrix;
    
    this.layers.add(this.layer0);
    this.layers.add(this.layer1);
  }
  
  addToLayer0(item) {
    this.layer0.add(item);
  }
  
  addToLayer1(item) {
    this.layer1.add(item);
  }
  
  removeFromLayer0(item) {
    this.layer0.remove(item);
  }
  
  removeFromLayer1(item) {
    this.layer1.remove(item);
  }
  
  pushToQueueOfLayer0(item) {
    this.layer0.pushToQueue(item);
  }
  
  pushToQueueOfLayer1(item) {
    this.layer1.pushToQueue(item);
  }
  
  render() {
    this.layers.render();
  }
  
  draw(context) {
    let now = performance.now() / 1000;
    let delta = now - this.then;
    
    this.then = now;
    
    this.layers.blend = this.blend;
    this.layers.draw(context);
    
    let blendTowardsZero = this.viewMatrix.a >= this.scaleThreshold;
    
    if (this.duration == 0) {
      this.blend = blendTowardsZero ? 0 : 1;
    } else if (blendTowardsZero) {
      this.blend -= delta / this.duration;
      this.blend = Math.max(0, this.blend);
    } else {
      this.blend += delta / this.duration;
      this.blend = Math.min(1, this.blend);
    }
  }
}