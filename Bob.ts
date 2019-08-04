import { receiveMessageServer, waitForMessage } from "./receiveMessageServer";
import { ADD, BYE, RES } from "./Message";
import { sendMessage } from "./sendMessage";
import { roles, initialize, connectedRoles, OneTransitionPossibleException } from "./globalObjects";

interface IBob {
    state: string;
}

interface IBob_S1 extends IBob {
    readonly state: "S1";
    recv(): Promise<IBob_S2 | IBob_S3 | IBob_S4 | IBob_S5>;
}

interface IBob_S2 extends IBob {
    readonly state: "S2";
    add: ADD;
    sendRES(res: RES): Promise<IBob_S1>;
}

interface IBob_S3 extends IBob {
    readonly state: "S3";
    add: ADD;
    sendRES(res: RES): Promise<IBob_S1>;
}

interface IBob_S4 extends IBob {
    readonly state: "S4";
    bye?: BYE;
    recv(): Promise<IBob_S6 | IBob_S7>;
}

interface IBob_S5 extends IBob {
    readonly state: "S5";
    bye?: BYE;
    recv(): Promise<IBob_S8 | IBob_S7>;
}

interface IBob_S6 extends IBob {
    readonly state: "S6";
    add: ADD;
    sendRES(res: RES): Promise<IBob_S4>;
}

interface IBob_S7 extends IBob {
    readonly state: "S7";
    bye?: BYE;
}

interface IBob_S8 extends IBob {
    readonly state: "S8";
    add: ADD;
    sendRES(res: RES): Promise<IBob_S5>;
}

abstract class Bob {
    constructor(protected transitionPossible: boolean = true) { }
    ;
    protected checkOneTransitionPossible() {
        if (!this.transitionPossible)
            throw new OneTransitionPossibleException("Only one transition possible from a state");
        this.transitionPossible = false;
    }
}

class Bob_S1 extends Bob implements IBob_S1 {
    public readonly state = "S1";
    constructor() {
        super();
    }
    async recv(): Promise<IBob_S2 | IBob_S3 | IBob_S4 | IBob_S5> {
        try {
            super.checkOneTransitionPossible();
        }
        catch (exc) {
            return new Promise((resolve, reject) => reject(exc));
        }
        let msg = await waitForMessage();
        return new Promise(resolve => {
            switch (msg.name + msg.from) {
                case ADD.name + roles.alice: {
                    resolve(new Bob_S2((<ADD>msg)));
                    break;
                }
                case ADD.name + roles.fred: {
                    resolve(new Bob_S3((<ADD>msg)));
                    break;
                }
                case BYE.name + roles.alice: {
                    resolve(new Bob_S4((<BYE>msg)));
                    break;
                }
                case BYE.name + roles.fred: {
                    resolve(new Bob_S5((<BYE>msg)));
                    break;
                }
            }
        });
    }
}

class Bob_S2 extends Bob implements IBob_S2 {
    public readonly state = "S2";
    constructor(public add: ADD) {
        super();
    }
    async sendRES(res: RES): Promise<IBob_S1> {
        super.checkOneTransitionPossible();
        await sendMessage(roles.bob, roles.alice, res);
        return new Promise(resolve => resolve(new Bob_S1));
    }
}

class Bob_S3 extends Bob implements IBob_S3 {
    public readonly state = "S3";
    constructor(public add: ADD) {
        super();
    }
    async sendRES(res: RES): Promise<IBob_S1> {
        super.checkOneTransitionPossible();
        await sendMessage(roles.bob, roles.fred, res);
        return new Promise(resolve => resolve(new Bob_S1));
    }
}

class Bob_S4 extends Bob implements IBob_S4 {
    public readonly state = "S4";
    constructor(public bye?: BYE) {
        super();
    }
    async recv(): Promise<IBob_S6 | IBob_S7> {
        try {
            super.checkOneTransitionPossible();
        }
        catch (exc) {
            return new Promise((resolve, reject) => reject(exc));
        }
        let msg = await waitForMessage();
        return new Promise(resolve => {
            switch (msg.name + msg.from) {
                case ADD.name + roles.fred: {
                    resolve(new Bob_S6((<ADD>msg)));
                    break;
                }
                case BYE.name + roles.fred: {
                    resolve(new Bob_S7((<BYE>msg)));
                    break;
                }
            }
        });
    }
}

class Bob_S5 extends Bob implements IBob_S5 {
    public readonly state = "S5";
    constructor(public bye?: BYE) {
        super();
    }
    async recv(): Promise<IBob_S8 | IBob_S7> {
        try {
            super.checkOneTransitionPossible();
        }
        catch (exc) {
            return new Promise((resolve, reject) => reject(exc));
        }
        let msg = await waitForMessage();
        return new Promise(resolve => {
            switch (msg.name + msg.from) {
                case ADD.name + roles.alice: {
                    resolve(new Bob_S8((<ADD>msg)));
                    break;
                }
                case BYE.name + roles.alice: {
                    resolve(new Bob_S7((<BYE>msg)));
                    break;
                }
            }
        });
    }
}

class Bob_S6 extends Bob implements IBob_S6 {
    public readonly state = "S6";
    constructor(public add: ADD) {
        super();
    }
    async sendRES(res: RES): Promise<IBob_S4> {
        super.checkOneTransitionPossible();
        await sendMessage(roles.bob, roles.fred, res);
        return new Promise(resolve => resolve(new Bob_S4));
    }
}

class Bob_S7 extends Bob implements IBob_S7 {
    public readonly state = "S7";
    constructor(public bye?: BYE) {
        super();
        receiveMessageServer.terminate();
    }
}

class Bob_S8 extends Bob implements IBob_S8 {
    public readonly state = "S8";
    constructor(public add: ADD) {
        super();
    }
    async sendRES(res: RES): Promise<IBob_S5> {
        super.checkOneTransitionPossible();
        await sendMessage(roles.bob, roles.alice, res);
        return new Promise(resolve => resolve(new Bob_S5));
    }
}

export { IBob, IBob_S1, IBob_S2, IBob_S3, IBob_S4, IBob_S5, IBob_S6, IBob_S7, IBob_S8 };

export async function executeProtocol(f: (IBob_S1: IBob_S1) => Promise<IBob_S7>, host: string, port: number) {
    console.log(`Bob started ${new Date()}`);
    await initialize(roles.bob, port, host);
    let done = await f(new Bob_S1());
    return new Promise<IBob_S7>(resolve => resolve(done));
}
