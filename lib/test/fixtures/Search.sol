contract TestContract {

  int public intValue;
  string public stringValue;

  constructor (int _intValue, string _stringValue) {
    intValue = _intValue;
    stringValue = _stringValue;
  }
}