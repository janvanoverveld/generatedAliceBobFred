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
    sendADD(add: ADD): Promise<IFred_S2>;
    sendBYE(bye: BYE): Promise<IFred_S3>;
}

interface IFred_S2 extends IFred {
    readonly state: "S2";
    recv(): Promise<IFred_S1>;
}

interface IFred_S3 extends IFred {
    readonly state: "S3";
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
    public readonly state = "S2";
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
    public readonly state = "S3";
    constructor() {
        super();
        receiveMessageServer.terminate();
    }
}

export { IFred, IFred_S1, IFred_S2, IFred_S3 };

export async function executeProtocol(f: (IFred_S1: IFred_S1) => Promise<IFred_S3>, host: string, port: number) {
    console.log(`Fred started ${new Date()}`);
    await initialize(roles.fred, port, host);
    let done = await f(new Fred_S1());
    return new Promise<IFred_S3>(resolve => resolve(done));
}
