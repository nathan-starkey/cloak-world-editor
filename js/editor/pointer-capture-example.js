function pointerdown(ev) {
  if (!ev.isPrimary) {
    return;
  }
  
  if (PREDICATE) {
    element.setPointerCapture(ev.pointerId);
    element.addEventListener("pointermove", pointermove);
    element.addEventListener("pointerup", pointerup);
    ev.stopImmediatePropogation();
  }
}

function pointermove(ev) {
  
}

function pointerup(ev) {
  
}

function lostpointercapture(ev) {
  element.removeEventListener("pointermove", pointermove);
  element.removeEventListener("pointerup", pointerup);
}