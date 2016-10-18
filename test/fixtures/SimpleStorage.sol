contract SimpleStorage {
    uint storedData = 123;
    function set(uint x) {
        storedData = x;
    }
    function get() returns (uint) {
        return storedData;
    }
}
