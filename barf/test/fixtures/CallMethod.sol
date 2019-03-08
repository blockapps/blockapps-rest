contract TestContract {

  uint var1;

  constructor (uint _var1) {
    var1 = _var1;
  }

  function multiply(uint _var2) returns(uint) {
    return (var1 * _var2);
  }

  function multiplyPayable(uint _var2) payable returns(uint) {
    return (var1 * _var2);
  }
}