import "./A.sol"
import "./D.sol"

contract Main {
  A AA;
  B BB;
  C CC;
  D DD;
  constructor () {
    AA = new A();
    BB = new B();
    CC = new C();
    DD = new D();
  }
}
