import { receiveMessageServer, waitForMessage } from "./receiveMessageServer";
import { ADD, BYE, RES, Message, NOMESSAGE } from "./Message";
import { sendMessage } from "./sendMessage";
import { roles, initialize, connectedRoles, OneTransitionPossibleException } from "./globalObjects";

enum messages {
    ADD = "ADD",
    BYE = "BYE",
    RES = "RES",
    NOMESSAGE = "NOMESSAGE"
}

interface IFred {
    messageFrom: roles;
    messageType: messages;
    message: Message;
}

interface IFred_S1 extends IFred {
    sendADD(add: ADD): Promise<IFred_S2>;
    sendBYE(bye: BYE): Promise<IFred_S3>;
}

interface IFred_S2 extends IFred {
    recv(): Promise<IFred_S1>;
}

interface IFred_S3 extends IFred {
}

abstract class Fred {
    public messageFrom = roles.fred;
    public messageType = messages.NOMESSAGE;
    public message = new NOMESSAGE();
    constructor(protected transitionPossible: boolean = true) { }
    ;
    protected checkOneTransitionPossible() {
        if (!this.transitionPossible)
            throw new OneTransitionPossibleException("Only one transition possible from a state");
        this.transitionPossible = false;
    }
}

class Fred_S1 extends Fred implements IFred_S1 {
    constructor(messageFrom?: roles, messageType?: messages, message?: Message) {
        super();
        if (messageFrom)
            super.messageFrom = messageFrom;
        if (messageType)
            super.messageType = messageType;
        if (message)
            super.message = message;
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
                    resolve(new Fred_S1(msg.from, messages.RES, msg));
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

export { IFred, IFred_S1, IFred_S2, IFred_S3, messages, Fred_Start, Fred_End, executeProtocol, roles };

