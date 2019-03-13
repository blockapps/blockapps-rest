contract TestContract {
  uint[] array;
  constructor (uint _size) {
    for (var i=0; i < _size; i++) {
      array.push(i);
    }
  }
}