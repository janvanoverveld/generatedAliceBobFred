import { receiveMessageServer, waitForMessage } from "./receiveMessageServer";
import { ADD, BYE, RES, Message, NOMESSAGE } from "./Message";
import { sendMessage } from "./sendMessage";
import { roles, initialize, connectedRoles, OneTransitionPossibleException } from "./globalObjects";

enum messages {
    ADD = "ADD",
    BYE = "BYE",
    RES = "RES"
}

interface IFred {
}

interface IFred_S1 extends IFred {
    readonly messageFrom: roles.bob;
    readonly messageType: messages.RES;
    message?: RES;
    sendADD(add: ADD): Promise<IFred_S2>;
    sendBYE(bye: BYE): Promise<IFred_S3>;
}

interface IFred_S2 extends IFred {
    recv(): Promise<IFred_S1>;
}

interface IFred_S3 extends IFred {
}

abstract class Fred implements IFred {
    constructor(protected transitionPossible: boolean = true) { }
    ;
    protected checkOneTransitionPossible() {
        if (!this.transitionPossible)
            throw new OneTransitionPossibleException("Only one transition possible from a state");
        this.transitionPossible = false;
    }
}

class Fred_S1 extends Fred implements IFred_S1 {
    readonly messageFrom = roles.bob;
    readonly messageType = messages.RES;
    constructor(public message?: RES) {
        super();
    }
    async sendADD(add: ADD): Promise<IFred_S2> {
        super.checkOneTransitionPossible();
        await sendMessage(roles.fred, roles.bob, add);
        return new Promise(resolve => resolve(new Fred_S2));
    }
    async sendBYE(bye: BYE): Promise<IFred_S3> {
        super.checkOneTransitionPossible();
        await sendMessage(roles.fred, roles.bob, bye);
        return new Promise(resolve => resolve(new Fred_S3));
    }
}

class Fred_S2 extends Fred implements IFred_S2 {
    constructor() {
        super();
    }
    async recv(): Promise<IFred_S1> {
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

class Fred_S3 extends Fred implements IFred_S3 {
    constructor() {
        super();
        receiveMessageServer.terminate();
    }
}

type Fred_Start = IFred_S1;
type Fred_End = IFred_S3;

async function executeProtocol(f: (Fred_Start: Fred_Start) => Promise<Fred_End>, host: string, port: number) {
    console.log(`Fred started ${new Date()}`);
    await initialize(roles.fred, port, host);
    let done = await f(new Fred_S1());
    return new Promise<Fred_End>(resolve => resolve(done));
}

export { IFred, IFred_S2, messages, Fred_Start, Fred_End, executeProtocol, roles };

