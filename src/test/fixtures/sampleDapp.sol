contract Event {
    string someString;
    uint someInt;

    constructor(string _someString, uint _someInt) public {
        someString = _someString;
        someInt = _someInt;
    }

    function updateNumber(uint _someInt) public {
        someInt = _someInt;
    }

    function updateString(string _someString) public {
        someString = _someString;
    }
}

contract EventManager {
    address[] public events;
    uint uid;

    constructor (uint _uid) public {
        uid = _uid;
    }

    function createEvent(string _someString, uint _someInt) public {
        Event e = new Event(_someString, _someInt);
        events.push(address(e));
    }
}

contract Ticket {
    string ticketNumber;
    string pnr;

    constructor(string _ticketNumber, string _pnr) public {
        ticketNumber = _ticketNumber;
        pnr = _pnr;
    }
}

contract TicketManager {
    address[] public tickets;
    uint uid;

    constructor (uint _uid) public {
        uid = _uid;
    }

    function createTicket(string _ticketNumber, string _pnr) public {
        Ticket t = new Ticket(_ticketNumber, _pnr);
        tickets.push(address(t));
    }
}

contract Transaction {
    string transactionId;

    constructor(string _transactionId) public {
        transactionId = _transactionId;
    }
}

contract TransactionManager {
    address[] public transactions;
    uint uid;

    constructor (uint _uid) public {
        uid = _uid;
    }

    function createTransaction(string _transactionId) public {
        Transaction t = new Transaction(_transactionId);
        transactions.push(address(t));
    }
}

contract AdminInterface {
    EventManager eventManager;
    TicketManager ticketManager;
    TransactionManager transactionManager;

    constructor(uint uid) public {
        eventManager = new EventManager(uid);
        ticketManager = new TicketManager(uid);
        transactionManager = new TransactionManager(uid);
    }
}