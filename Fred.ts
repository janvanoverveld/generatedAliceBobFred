import { receiveMessageServer, waitForMessage } from "./receiveMessageServer";
import { ADD, BYE, RES } from "./Message";
import { sendMessage } from "./sendMessage";
import { roles, initialize, connectedRoles, OneTransitionPossibleException } from "./globalObjects";

interface IFred {
    state: string;
}

interface IFred_S1 extends IFred {
    readonly state: "S1";
    res?: RES;
    sendADD(add: ADD): IFred_S2;
    sendBYE(bye: BYE): IFred_Done;
}

interface IFred_S2 extends IFred {
    readonly state: "S2";
    add: ADD;
    receive(): Promise<IFred_S1>;
}

interface IFred_Done extends IFred {
    readonly state: "Done";
    bye: BYE;
}

abstract class Fred {
    constructor(protected transitionPossible: boolean = true) { }
    ;
    protected checkOneTransitionPossible() {
        if (!this.transitionPossible)
            throw new OneTransitionPossibleException("Only one transition possible from a state");
        this.transitionPossible = false;
    }
}

class Fred_S1 extends Fred implements IFred_S1 {
    public readonly state = "S1";
    constructor(public res?: RES) {
        super();
    }
    sendADD(add: ADD): IFred_S2 {
        super.checkOneTransitionPossible();
        sendMessage(roles.fred, roles.bob, add);
        return new Fred_S2(add);
    }
    sendBYE(bye: BYE): IFred_Done {
        super.checkOneTransitionPossible();
        sendMessage(roles.fred, roles.bob, bye);
        return new Fred_Done(bye);
    }
}

class Fred_S2 extends Fred implements IFred_S2 {
    public readonly state = "S2";
    constructor(public add: ADD) {
        super();
    }
    async receive(): Promise<IFred_S1> {
        try {
            super.checkOneTransitionPossible();
        }
        catch (exc) {
            return new Promise((resolve, reject) => reject(exc));
        }
        let msg = await waitForMessage();
        return new Promise(resolve => {
            switch (msg.name + msg.from) {
                case RES.name + roles.bob: {
                    resolve(new Fred_S1((<RES>msg)));
                    break;
                }
            }
        });
    }
}

class Fred_Done extends Fred implements IFred_Done {
    public readonly state = "Done";
    constructor(public bye: BYE) {
        super();
        receiveMessageServer.terminate();
    }
}

export { IFred, IFred_S1, IFred_S2, IFred_Done };

export async function executeProtocol(f: (S1: IFred_S1) => Promise<IFred_Done>, host: string, port: number) {
    console.log(`Fred started ${new Date()}`);
    await initialize(roles.fred, port, host);
    let done = await f(new Fred_S1());
    return new Promise<IFred_Done>(resolve => resolve(done));
}
