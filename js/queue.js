// queue.js
//
// description:
//  Dead-simple queue implementation.
//
//  _data = [ ., ..., ., a0, a1, a2, ..., an ]
//                       ^
//                    _outpos
//
//  The _data array has _outpos invalid entries, followed by size valid
//  entries. Newly queueued entries are pushed onto the end of the array.
//  Dequeuing returns _data[_outpos].
//
//  When the number of invalid entries is >= the number of valid size, shift
//  the entire array left by _outpos, thereby eliminating all invalid entries.
//  This is an O(n) operation that will occur for every n dequeue operations,
//  so dequeue is, on average, O(1).

var Queue = (function() {


  function Queue() {
    this._data = [];

    // number of entries in the queue
    this.size = 0;

    // position of the next element to dequeue
    this._outpos = 0;
  }

  Object.assign(Queue.prototype, {

    enqueue: function(item) {
      this._data.push(item);
      this.size++;
    },

    dequeue: function() {
      if (this.size === 0) return undefined;

      // get the value to dequeue
      var value = this._data[this._outpos++];

      // one fewer entry
      this.size--;

      // if the number of invalid entries is >= the number of valid entries,
      // shift valid entries back to 0
      if (this._outpos >= this.size) {
        this._data.splice(0, this._outpos);
        this._outpos = 0;
      }

      return value;
    }

  });

  return Queue;

})();